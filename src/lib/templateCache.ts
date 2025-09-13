import { createClient } from 'redis';
import fs from 'fs/promises';
import path from 'path';
import { ImgflipTemplate } from './imgflip';

// Types
export interface CachedTemplate extends ImgflipTemplate {
  score: number;
  freshness: number;
  redditUpvotes?: number;
  redditCreated?: number;
  lastUpdated: number;
  source: 'reddit' | 'imgflip' | 'both';
}

export interface TemplateCache {
  templates: CachedTemplate[];
  lastUpdated: number;
  totalTemplates: number;
  sources: {
    reddit: number;
    imgflip: number;
    both: number;
  };
}

// Configuration
const CACHE_TTL_HOURS = 6; // Refresh every 6 hours
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;
const CACHE_KEY = 'trending_templates_v2';
const CACHE_FILE_PATH = path.join(process.cwd(), '.cache', 'templates.json');

// Redis client (lazy initialization)
let redisClient: ReturnType<typeof createClient> | null = null;
let redisAvailable = false;

// Initialize Redis if available
const initializeRedis = async (): Promise<void> => {
  if (process.env.REDIS_URL && !redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL,
      });
      
      redisClient.on('error', (err) => {
        console.warn('Template cache Redis error:', err);
        redisAvailable = false;
      });
      
      await redisClient.connect();
      redisAvailable = true;
      console.log('Template cache: Redis connected');
    } catch (error) {
      console.warn('Template cache: Redis connection failed, using file fallback:', error);
      redisClient = null;
      redisAvailable = false;
    }
  }
};

// Ensure cache directory exists
const ensureCacheDir = async (): Promise<void> => {
  const cacheDir = path.dirname(CACHE_FILE_PATH);
  try {
    await fs.access(cacheDir);
  } catch {
    await fs.mkdir(cacheDir, { recursive: true });
  }
};

// Get cached templates from Redis
const getCacheFromRedis = async (): Promise<TemplateCache | null> => {
  if (!redisClient || !redisAvailable) return null;
  
  try {
    const cached = await redisClient.get(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as TemplateCache;
    
    // Check if cache is expired
    if (Date.now() - data.lastUpdated > CACHE_TTL_MS) {
      console.log('Template cache: Redis cache expired');
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Template cache: Error reading from Redis:', error);
    return null;
  }
};

// Save cache to Redis
const saveCacheToRedis = async (cache: TemplateCache): Promise<void> => {
  if (!redisClient || !redisAvailable) return;
  
  try {
    await redisClient.setEx(
      CACHE_KEY,
      CACHE_TTL_HOURS * 3600, // TTL in seconds
      JSON.stringify(cache)
    );
    console.log(`Template cache: Saved ${cache.templates.length} templates to Redis`);
  } catch (error) {
    console.error('Template cache: Error saving to Redis:', error);
  }
};

// Get cached templates from file system
const getCacheFromFile = async (): Promise<TemplateCache | null> => {
  try {
    await ensureCacheDir();
    const data = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const cache = JSON.parse(data) as TemplateCache;
    
    // Check if cache is expired
    if (Date.now() - cache.lastUpdated > CACHE_TTL_MS) {
      console.log('Template cache: File cache expired');
      return null;
    }
    
    return cache;
  } catch (error) {
    // File doesn't exist or is corrupted
    return null;
  }
};

// Save cache to file system
const saveCacheToFile = async (cache: TemplateCache): Promise<void> => {
  try {
    await ensureCacheDir();
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2));
    console.log(`Template cache: Saved ${cache.templates.length} templates to file`);
  } catch (error) {
    console.error('Template cache: Error saving to file:', error);
  }
};

// Calculate template freshness score (0-1, higher is fresher)
export const calculateFreshnessScore = (
  redditCreated?: number,
  templateAge?: number
): number => {
  const now = Date.now() / 1000; // Unix timestamp
  
  if (redditCreated) {
    // Reddit post age in hours
    const ageHours = (now - redditCreated) / 3600;
    
    // Freshness decays over time:
    // - 0-6 hours: 1.0 (maximum freshness)
    // - 6-24 hours: 0.8-1.0 (very fresh)
    // - 1-7 days: 0.3-0.8 (still fresh)
    // - 7+ days: 0.1-0.3 (old)
    if (ageHours <= 6) return 1.0;
    if (ageHours <= 24) return 0.8 + (0.2 * (1 - (ageHours - 6) / 18));
    if (ageHours <= 168) return 0.3 + (0.5 * (1 - (ageHours - 24) / 144)); // 7 days
    return Math.max(0.1, 0.3 * (1 - (ageHours - 168) / (168 * 4))); // Up to 28 days
  }
  
  // Fallback for templates without Reddit data
  return 0.5;
};

// Calculate overall template score
export const calculateTemplateScore = (
  template: Partial<CachedTemplate>,
  redditUpvotes = 0,
  redditCreated?: number
): number => {
  const freshnessScore = calculateFreshnessScore(redditCreated);
  const popularityScore = redditUpvotes ? Math.min(redditUpvotes / 1000, 1.0) : 0.3;
  const imgflipScore = template.box_count ? Math.min(template.box_count / 5, 1.0) : 0.2;
  
  // Weighted combination:
  // - 40% freshness (recency)
  // - 35% Reddit popularity (viral potential)  
  // - 25% Imgflip characteristics (usability)
  return (
    freshnessScore * 0.4 +
    popularityScore * 0.35 +
    imgflipScore * 0.25
  );
};

// Get cached templates (try Redis first, then file)
export const getCachedTemplates = async (): Promise<TemplateCache | null> => {
  // Try Redis first
  if (!redisClient && process.env.REDIS_URL) {
    await initializeRedis();
  }
  
  let cache = await getCacheFromRedis();
  if (cache) {
    console.log(`Template cache: Retrieved ${cache.templates.length} templates from Redis`);
    return cache;
  }
  
  // Fallback to file cache
  cache = await getCacheFromFile();
  if (cache) {
    console.log(`Template cache: Retrieved ${cache.templates.length} templates from file`);
    return cache;
  }
  
  console.log('Template cache: No valid cache found');
  return null;
};

// Save templates to cache (both Redis and file)
export const saveCachedTemplates = async (cache: TemplateCache): Promise<void> => {
  console.log(`Template cache: Saving ${cache.templates.length} templates`);
  
  // Try to initialize Redis if not already done
  if (!redisClient && process.env.REDIS_URL) {
    await initializeRedis();
  }
  
  // Save to both Redis and file system in parallel
  await Promise.all([
    saveCacheToRedis(cache),
    saveCacheToFile(cache)
  ]);
};

// Check if cache is valid and fresh
export const isCacheValid = async (): Promise<boolean> => {
  const cache = await getCachedTemplates();
  return cache !== null && cache.templates.length > 0;
};

// Get cache stats
export const getCacheStats = async (): Promise<{
  cached: boolean;
  age: number;
  templates: number;
  sources: { reddit: number; imgflip: number; both: number } | null;
  lastUpdated: string | null;
}> => {
  const cache = await getCachedTemplates();
  
  if (!cache) {
    return {
      cached: false,
      age: 0,
      templates: 0,
      sources: null,
      lastUpdated: null
    };
  }
  
  return {
    cached: true,
    age: Date.now() - cache.lastUpdated,
    templates: cache.templates.length,
    sources: cache.sources,
    lastUpdated: new Date(cache.lastUpdated).toISOString()
  };
};

// Clear cache (for testing/debugging)
export const clearCache = async (): Promise<void> => {
  // Clear Redis
  if (redisClient && redisAvailable) {
    try {
      await redisClient.del(CACHE_KEY);
      console.log('Template cache: Redis cache cleared');
    } catch (error) {
      console.error('Template cache: Error clearing Redis:', error);
    }
  }
  
  // Clear file cache
  try {
    await fs.unlink(CACHE_FILE_PATH);
    console.log('Template cache: File cache cleared');
  } catch (error) {
    // File might not exist
  }
};