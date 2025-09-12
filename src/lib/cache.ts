import { createClient } from 'redis';
import { LRUCache } from 'lru-cache';

// Types
interface CacheItem<T> {
  value: T;
  expiry: number;
}

type CacheValue = string | number | object | boolean | null;

// Configuration
const DEFAULT_TTL_SECONDS = 300; // 5 minutes default
const CAPTIONS_CACHE_TTL = 60 * 5; // 5 minutes for captions
const IMAGE_CACHE_TTL = 60 * 60 * 24; // 24 hours for image URLs

// In-memory LRU cache fallback
const lruCache = new LRUCache<string, CacheItem<CacheValue>>({
  max: 1000, // Maximum number of items to cache
  ttl: DEFAULT_TTL_SECONDS * 1000, // TTL in milliseconds
});

// Redis client (lazy initialization - reuse from rate limiter if available)
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
        console.warn('Cache Redis client error:', err);
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
      console.warn('Failed to initialize Cache Redis:', error);
      redisClient = null;
      redisAvailable = false;
    }
  }
};

// Normalize cache keys
const normalizeKey = (key: string): string => {
  return key.toLowerCase().trim().replace(/\s+/g, '_');
};

// Create cache key with prefix
const createCacheKey = (prefix: string, key: string): string => {
  return `cache:${prefix}:${normalizeKey(key)}`;
};

// Redis cache operations
const setRedisCache = async <T extends CacheValue>(
  key: string, 
  value: T, 
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<boolean> => {
  if (!redisClient || !redisAvailable) {
    return false;
  }
  
  try {
    const serializedValue = JSON.stringify(value);
    await redisClient.setEx(key, ttlSeconds, serializedValue);
    return true;
  } catch (error) {
    console.warn('Redis cache set error:', error);
    redisAvailable = false;
    return false;
  }
};

const getRedisCache = async <T extends CacheValue>(key: string): Promise<T | null> => {
  if (!redisClient || !redisAvailable) {
    return null;
  }
  
  try {
    const value = await redisClient.get(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Redis cache get error:', error);
    redisAvailable = false;
    return null;
  }
};

const deleteRedisCache = async (key: string): Promise<boolean> => {
  if (!redisClient || !redisAvailable) {
    return false;
  }
  
  try {
    const result = await redisClient.del(key);
    return result > 0;
  } catch (error) {
    console.warn('Redis cache delete error:', error);
    redisAvailable = false;
    return false;
  }
};

// LRU cache operations
const setLRUCache = <T extends CacheValue>(
  key: string, 
  value: T, 
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): void => {
  const expiry = Date.now() + (ttlSeconds * 1000);
  lruCache.set(key, { value, expiry }, { ttl: ttlSeconds * 1000 });
};

const getLRUCache = <T extends CacheValue>(key: string): T | null => {
  const item = lruCache.get(key);
  if (!item) {
    return null;
  }
  
  // Check if item has expired
  if (Date.now() > item.expiry) {
    lruCache.delete(key);
    return null;
  }
  
  return item.value as T;
};

const deleteLRUCache = (key: string): boolean => {
  return lruCache.delete(key);
};

// Main cache interface
class Cache {
  private async ensureRedis(): Promise<void> {
    if (!redisClient && process.env.REDIS_URL) {
      await initializeRedis();
    }
  }

  async set<T extends CacheValue>(
    key: string, 
    value: T, 
    ttlSeconds: number = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    await this.ensureRedis();
    
    // Try Redis first
    const redisSuccess = await setRedisCache(key, value, ttlSeconds);
    
    // Always set in LRU as fallback
    setLRUCache(key, value, ttlSeconds);
    
    if (!redisSuccess && redisAvailable) {
      console.warn(`Failed to set cache in Redis for key: ${key}`);
    }
  }

  async get<T extends CacheValue>(key: string): Promise<T | null> {
    await this.ensureRedis();
    
    // Try Redis first
    if (redisAvailable) {
      const redisValue = await getRedisCache<T>(key);
      if (redisValue !== null) {
        return redisValue;
      }
    }
    
    // Fallback to LRU
    return getLRUCache<T>(key);
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureRedis();
    
    // Delete from both Redis and LRU
    const redisDeleted = await deleteRedisCache(key);
    const lruDeleted = deleteLRUCache(key);
    
    return redisDeleted || lruDeleted;
  }

  async clear(): Promise<void> {
    await this.ensureRedis();
    
    // Clear LRU cache
    lruCache.clear();
    
    // Clear Redis cache (only our cache keys)
    if (redisClient && redisAvailable) {
      try {
        const keys = await redisClient.keys('cache:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } catch (error) {
        console.warn('Redis cache clear error:', error);
      }
    }
  }

  // Specialized methods for different cache types
  async setCaptions(topic: string, templateId: string | undefined, captions: string[]): Promise<void> {
    const key = createCacheKey('captions', `${topic}:${templateId || 'default'}`);
    await this.set(key, captions, CAPTIONS_CACHE_TTL);
  }

  async getCaptions(topic: string, templateId: string | undefined): Promise<string[] | null> {
    const key = createCacheKey('captions', `${topic}:${templateId || 'default'}`);
    return await this.get<string[]>(key);
  }

  async setImageUrl(templateId: string, topText: string, bottomText: string, imageUrl: string): Promise<void> {
    const key = createCacheKey('image', `${templateId}:${topText}:${bottomText}`);
    await this.set(key, imageUrl, IMAGE_CACHE_TTL);
  }

  async getImageUrl(templateId: string, topText: string, bottomText: string): Promise<string | null> {
    const key = createCacheKey('image', `${templateId}:${topText}:${bottomText}`);
    return await this.get<string>(key);
  }

  // Health check
  async isRedisAvailable(): Promise<boolean> {
    await this.ensureRedis();
    return redisAvailable;
  }
}

// Singleton instance
const cache = new Cache();

export default cache;

// Export types and constants for testing
export { 
  Cache, 
  normalizeKey, 
  createCacheKey, 
  CAPTIONS_CACHE_TTL, 
  IMAGE_CACHE_TTL,
  DEFAULT_TTL_SECONDS 
};

// Cleanup function for graceful shutdown
export const cleanupCache = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      console.error('Error closing Cache Redis connection:', error);
    }
  }
};