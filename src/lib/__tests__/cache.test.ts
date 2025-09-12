import { jest } from '@jest/globals';
import cache, { 
  Cache, 
  normalizeKey, 
  createCacheKey, 
  CAPTIONS_CACHE_TTL, 
  IMAGE_CACHE_TTL,
  DEFAULT_TTL_SECONDS,
  cleanupCache 
} from '../cache';

// Mock Redis
const mockRedisClient = {
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  connect: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

// Mock the redis module
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe('Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.REDIS_URL;
  });

  afterEach(async () => {
    await cleanupCache();
    // Clear the singleton cache
    await cache.clear();
  });

  describe('Key normalization', () => {
    it('should normalize keys to lowercase', () => {
      const normalized = normalizeKey('HELLO WORLD');
      expect(normalized).toBe('hello_world');
    });

    it('should trim whitespace from keys', () => {
      const normalized = normalizeKey('  hello world  ');
      expect(normalized).toBe('hello_world');
    });

    it('should replace multiple spaces with underscores', () => {
      const normalized = normalizeKey('hello   world    test');
      expect(normalized).toBe('hello_world_test');
    });

    it('should handle special characters correctly', () => {
      const normalized = normalizeKey('Hello World! @#$ Test');
      expect(normalized).toBe('hello_world!_@#$_test');
    });

    it('should handle empty strings', () => {
      const normalized = normalizeKey('');
      expect(normalized).toBe('');
    });
  });

  describe('Cache key creation', () => {
    it('should create proper cache keys with prefixes', () => {
      const key = createCacheKey('test', 'Hello World');
      expect(key).toBe('cache:test:hello_world');
    });

    it('should handle complex keys', () => {
      const key = createCacheKey('captions', 'Funny Cats:123456');
      expect(key).toBe('cache:captions:funny_cats:123456');
    });
  });

  describe('LRU Cache (no Redis)', () => {
    it('should set and get values from LRU cache', async () => {
      await cache.set('test-key', 'test-value', 300);
      const value = await cache.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should handle different data types', async () => {
      const objectValue = { name: 'test', count: 42 };
      const arrayValue = ['one', 'two', 'three'];
      const numberValue = 123;
      const booleanValue = true;
      const nullValue = null;

      await cache.set('object', objectValue, 300);
      await cache.set('array', arrayValue, 300);
      await cache.set('number', numberValue, 300);
      await cache.set('boolean', booleanValue, 300);
      await cache.set('null', nullValue, 300);

      expect(await cache.get('object')).toEqual(objectValue);
      expect(await cache.get('array')).toEqual(arrayValue);
      expect(await cache.get('number')).toBe(numberValue);
      expect(await cache.get('boolean')).toBe(booleanValue);
      expect(await cache.get('null')).toBe(nullValue);
    });

    it('should return null for non-existent keys', async () => {
      const value = await cache.get('non-existent-key');
      expect(value).toBeNull();
    });

    it('should delete values', async () => {
      await cache.set('delete-test', 'value', 300);
      expect(await cache.get('delete-test')).toBe('value');
      
      const deleted = await cache.delete('delete-test');
      expect(deleted).toBe(true);
      expect(await cache.get('delete-test')).toBeNull();
    });

    it('should handle TTL expiration', async () => {
      await cache.set('ttl-test', 'value', 1); // 1 second TTL
      expect(await cache.get('ttl-test')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(await cache.get('ttl-test')).toBeNull();
    });

    it('should clear all cached values', async () => {
      await cache.set('clear-test-1', 'value1', 300);
      await cache.set('clear-test-2', 'value2', 300);
      
      expect(await cache.get('clear-test-1')).toBe('value1');
      expect(await cache.get('clear-test-2')).toBe('value2');
      
      await cache.clear();
      
      expect(await cache.get('clear-test-1')).toBeNull();
      expect(await cache.get('clear-test-2')).toBeNull();
    });
  });

  describe('Redis Cache', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          handler();
        }
      });
    });

    it('should use Redis when available', async () => {
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify('test-value'));
      
      const value = await cache.get('redis-test');
      
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.get).toHaveBeenCalledWith('redis-test');
      expect(value).toBe('test-value');
    });

    it('should set values in Redis', async () => {
      mockRedisClient.setEx.mockResolvedValueOnce('OK');
      
      await cache.set('redis-set-test', 'test-value', 300);
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'redis-set-test',
        300,
        JSON.stringify('test-value')
      );
    });

    it('should delete from Redis', async () => {
      mockRedisClient.del.mockResolvedValueOnce(1);
      
      const deleted = await cache.delete('redis-delete-test');
      
      expect(mockRedisClient.del).toHaveBeenCalledWith('redis-delete-test');
      expect(deleted).toBe(true);
    });

    it('should clear Redis cache keys', async () => {
      mockRedisClient.keys.mockResolvedValueOnce(['cache:key1', 'cache:key2']);
      mockRedisClient.del.mockResolvedValueOnce(2);
      
      await cache.clear();
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['cache:key1', 'cache:key2']);
    });

    it('should fallback to LRU when Redis fails', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis error'));
      
      // First set a value in LRU cache directly
      await cache.set('fallback-test', 'fallback-value', 300);
      
      // Clear Redis connection to force LRU fallback
      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis error'));
      
      const value = await cache.get('fallback-test');
      expect(value).toBe('fallback-value');
    });

    it('should handle Redis connection errors gracefully', async () => {
      mockRedisClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await cache.set('error-test', 'value', 300);
      const value = await cache.get('error-test');
      
      // Should still work with LRU fallback
      expect(value).toBe('value');
    });
  });

  describe('Specialized cache methods', () => {
    describe('Captions cache', () => {
      it('should cache and retrieve captions', async () => {
        const topic = 'Funny Cats';
        const templateId = '123456';
        const captions = ['Caption 1', 'Caption 2', 'Caption 3'];

        await cache.setCaptions(topic, templateId, captions);
        const retrieved = await cache.getCaptions(topic, templateId);

        expect(retrieved).toEqual(captions);
      });

      it('should handle captions without template ID', async () => {
        const topic = 'Funny Dogs';
        const captions = ['Dog Caption 1', 'Dog Caption 2', 'Dog Caption 3'];

        await cache.setCaptions(topic, undefined, captions);
        const retrieved = await cache.getCaptions(topic, undefined);

        expect(retrieved).toEqual(captions);
      });

      it('should normalize topic keys for captions', async () => {
        const topic = 'FUNNY CATS   WITH SPACES';
        const templateId = '123456';
        const captions = ['Normalized Caption'];

        await cache.setCaptions(topic, templateId, captions);
        const retrieved = await cache.getCaptions('funny cats   with spaces', templateId);

        expect(retrieved).toEqual(captions);
      });

      it('should return null for non-existent captions', async () => {
        const retrieved = await cache.getCaptions('Non-existent topic', '999999');
        expect(retrieved).toBeNull();
      });
    });

    describe('Image URL cache', () => {
      it('should cache and retrieve image URLs', async () => {
        const templateId = '123456';
        const topText = 'Top Text';
        const bottomText = 'Bottom Text';
        const imageUrl = 'https://example.com/meme.jpg';

        await cache.setImageUrl(templateId, topText, bottomText, imageUrl);
        const retrieved = await cache.getImageUrl(templateId, topText, bottomText);

        expect(retrieved).toBe(imageUrl);
      });

      it('should handle images with only top text', async () => {
        const templateId = '123456';
        const topText = 'Only Top Text';
        const imageUrl = 'https://example.com/meme-top-only.jpg';

        await cache.setImageUrl(templateId, topText, '', imageUrl);
        const retrieved = await cache.getImageUrl(templateId, topText, '');

        expect(retrieved).toBe(imageUrl);
      });

      it('should normalize image cache keys', async () => {
        const templateId = '123456';
        const topText = 'TOP TEXT WITH   SPACES';
        const bottomText = 'bottom text';
        const imageUrl = 'https://example.com/normalized-meme.jpg';

        await cache.setImageUrl(templateId, topText, bottomText, imageUrl);
        const retrieved = await cache.getImageUrl(templateId, 'top text with   spaces', 'BOTTOM TEXT');

        expect(retrieved).toBe(imageUrl);
      });

      it('should return null for non-existent image URLs', async () => {
        const retrieved = await cache.getImageUrl('999999', 'Non-existent', 'Meme');
        expect(retrieved).toBeNull();
      });
    });
  });

  describe('Cache TTL configuration', () => {
    it('should use correct TTL for captions', async () => {
      const spy = jest.spyOn(cache, 'set');
      
      await cache.setCaptions('test topic', 'template', ['caption']);
      
      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        ['caption'],
        CAPTIONS_CACHE_TTL
      );
      
      spy.mockRestore();
    });

    it('should use correct TTL for image URLs', async () => {
      const spy = jest.spyOn(cache, 'set');
      
      await cache.setImageUrl('template', 'top', 'bottom', 'url');
      
      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        'url',
        IMAGE_CACHE_TTL
      );
      
      spy.mockRestore();
    });

    it('should verify TTL constants are correct', () => {
      expect(CAPTIONS_CACHE_TTL).toBe(300); // 5 minutes
      expect(IMAGE_CACHE_TTL).toBe(86400); // 24 hours
      expect(DEFAULT_TTL_SECONDS).toBe(300); // 5 minutes
    });
  });

  describe('Redis availability check', () => {
    it('should report Redis availability correctly', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      mockRedisClient.connect.mockResolvedValueOnce(undefined);
      mockRedisClient.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          handler();
        }
      });

      const available = await cache.isRedisAvailable();
      expect(available).toBe(true);
    });

    it('should report Redis unavailability when not configured', async () => {
      delete process.env.REDIS_URL;
      
      const available = await cache.isRedisAvailable();
      expect(available).toBe(false);
    });

    it('should report Redis unavailability when connection fails', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      mockRedisClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      const available = await cache.isRedisAvailable();
      expect(available).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle undefined and null values', async () => {
      await cache.set('undefined-test', undefined as any, 300);
      await cache.set('null-test', null, 300);
      
      expect(await cache.get('undefined-test')).toBeUndefined();
      expect(await cache.get('null-test')).toBeNull();
    });

    it('should handle empty strings as keys and values', async () => {
      await cache.set('', 'empty-key-value', 300);
      await cache.set('empty-value-test', '', 300);
      
      expect(await cache.get('')).toBe('empty-key-value');
      expect(await cache.get('empty-value-test')).toBe('');
    });

    it('should handle large objects', async () => {
      const largeObject = {
        data: new Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `This is item number ${i} with some additional text`,
        })),
      };

      await cache.set('large-object', largeObject, 300);
      const retrieved = await cache.get('large-object');
      
      expect(retrieved).toEqual(largeObject);
    });

    it('should handle concurrent operations', async () => {
      const promises = [];
      
      // Set multiple values concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`concurrent-${i}`, `value-${i}`, 300));
      }
      
      await Promise.all(promises);
      
      // Get all values concurrently
      const getPromises = [];
      for (let i = 0; i < 10; i++) {
        getPromises.push(cache.get(`concurrent-${i}`));
      }
      
      const results = await Promise.all(getPromises);
      
      for (let i = 0; i < 10; i++) {
        expect(results[i]).toBe(`value-${i}`);
      }
    });
  });
});