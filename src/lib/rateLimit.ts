import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';
import { LRUCache } from 'lru-cache';

// Types
interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

// In-memory LRU cache fallback
const lruCache = new LRUCache<string, { count: number; resetTime: number }>({
  max: 1000, // Maximum number of IPs to track
  ttl: RATE_LIMIT_WINDOW_MS, // TTL matches our rate limit window
});

// Redis client (lazy initialization)
let redisClient: ReturnType<typeof createClient> | null = null;
let redisAvailable = false;

// Initialize Redis client if REDIS_URL is available
const initializeRedis = async (): Promise<void> => {
  if (process.env.REDIS_URL && !redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL,
      });
      
      redisClient.on('error', (err) => {
        console.warn('Redis client error:', err);
        redisAvailable = false;
      });
      
      redisClient.on('connect', () => {
        redisAvailable = true;
      });
      
      redisClient.on('disconnect', () => {
        redisAvailable = false;
      });
      
      await redisClient.connect();
      redisAvailable = true;
    } catch (error) {
      console.warn('Failed to initialize Redis:', error);
      redisClient = null;
      redisAvailable = false;
    }
  }
};

// Get client IP address from request
const getClientIP = (req: NextApiRequest): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIP = req.headers['x-real-ip'] as string;
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return req.socket.remoteAddress || '127.0.0.1';
};

// Rate limiting with Redis
const rateLimitWithRedis = async (ip: string): Promise<RateLimitResult> => {
  if (!redisClient || !redisAvailable) {
    throw new Error('Redis not available');
  }
  
  const key = `rate_limit:${ip}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  
  try {
    // Use Redis sorted sets to track requests in time window
    const multi = redisClient.multi();
    
    // Remove old entries outside the time window
    multi.zRemRangeByScore(key, '-inf', windowStart);
    
    // Count current requests in the window
    multi.zCard(key);
    
    // Add current request
    multi.zAdd(key, { score: now, value: `${now}` });
    
    // Set expiry on the key
    multi.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    
    const results = await multi.exec();
    
    if (!results) {
      throw new Error('Redis multi execution failed');
    }
    
    const currentCount = (results[1]?.reply as number) || 0;
    
    if (currentCount >= RATE_LIMIT_MAX_REQUESTS) {
      return {
        success: false,
        limit: RATE_LIMIT_MAX_REQUESTS,
        remaining: 0,
        reset: now + RATE_LIMIT_WINDOW_MS,
      };
    }
    
    return {
      success: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS - currentCount - 1,
      reset: now + RATE_LIMIT_WINDOW_MS,
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    redisAvailable = false;
    throw error;
  }
};

// Rate limiting with LRU cache fallback
const rateLimitWithLRU = (ip: string): RateLimitResult => {
  const now = Date.now();
  const resetTime = Math.ceil(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  
  const existing = lruCache.get(ip);
  
  if (!existing || existing.resetTime <= now) {
    // First request in this window or window has reset
    lruCache.set(ip, { count: 1, resetTime });
    return {
      success: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      reset: resetTime,
    };
  }
  
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      success: false,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: 0,
      reset: existing.resetTime,
    };
  }
  
  // Increment count
  existing.count += 1;
  lruCache.set(ip, existing);
  
  return {
    success: true,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    reset: existing.resetTime,
  };
};

// Main rate limiting function
export const checkRateLimit = async (ip: string): Promise<RateLimitResult> => {
  // Initialize Redis on first use
  if (!redisClient && process.env.REDIS_URL) {
    await initializeRedis();
  }
  
  try {
    if (redisAvailable && redisClient) {
      return await rateLimitWithRedis(ip);
    }
  } catch (error) {
    console.warn('Redis rate limit failed, falling back to LRU:', error);
  }
  
  // Fallback to LRU cache
  return rateLimitWithLRU(ip);
};

// Middleware function for Next.js API routes
export const rateLimitMiddleware = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean> => {
  const ip = getClientIP(req);
  const result = await checkRateLimit(ip);
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.reset / 1000));
  
  if (!result.success) {
    res.status(429).json({ error: 'rate_limit_exceeded' });
    return false;
  }
  
  return true;
};

// Cleanup function for graceful shutdown
export const cleanup = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
};