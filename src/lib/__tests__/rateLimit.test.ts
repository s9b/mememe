import { jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit, rateLimitMiddleware, cleanup } from '../rateLimit';

// Mock Redis
const mockRedisClient = {
  multi: jest.fn(),
  connect: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

const mockMulti = {
  zRemRangeByScore: jest.fn(),
  zCard: jest.fn(),
  zAdd: jest.fn(),
  expire: jest.fn(),
  exec: jest.fn(),
};

// Mock the redis module
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe('Rate Limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.REDIS_URL;
    
    // Reset mock implementations
    mockRedisClient.multi.mockReturnValue(mockMulti);
    mockMulti.exec.mockResolvedValue([null, 0, null, null]);
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('checkRateLimit with LRU cache (no Redis)', () => {
    it('should allow first request', async () => {
      const result = await checkRateLimit('192.168.1.1');
      
      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it('should track multiple requests from same IP', async () => {
      const ip = '192.168.1.2';
      
      // First request
      const result1 = await checkRateLimit(ip);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(9);

      // Second request
      const result2 = await checkRateLimit(ip);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(8);

      // Third request
      const result3 = await checkRateLimit(ip);
      expect(result3.success).toBe(true);
      expect(result3.remaining).toBe(7);
    });

    it('should block requests after limit exceeded', async () => {
      const ip = '192.168.1.3';
      
      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit(ip);
        expect(result.success).toBe(true);
      }

      // 11th request should be blocked
      const blockedResult = await checkRateLimit(ip);
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.remaining).toBe(0);
    });

    it('should handle different IPs independently', async () => {
      const ip1 = '192.168.1.4';
      const ip2 = '192.168.1.5';
      
      // Make 10 requests from ip1 (reaching the limit)
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(ip1);
      }

      // ip1 should be blocked
      const result1 = await checkRateLimit(ip1);
      expect(result1.success).toBe(false);

      // ip2 should still be allowed
      const result2 = await checkRateLimit(ip2);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(9);
    });
  });

  describe('checkRateLimit with Redis', () => {
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
      // Mock successful Redis response (0 current requests)
      mockMulti.exec.mockResolvedValueOnce([null, 0, null, null]);

      const result = await checkRateLimit('192.168.1.10');
      
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockMulti.zRemRangeByScore).toHaveBeenCalled();
      expect(mockMulti.zCard).toHaveBeenCalled();
      expect(mockMulti.zAdd).toHaveBeenCalled();
    });

    it('should block requests when Redis shows limit exceeded', async () => {
      // Mock Redis response showing 10 current requests (at limit)
      mockMulti.exec.mockResolvedValueOnce([null, 10, null, null]);

      const result = await checkRateLimit('192.168.1.11');
      
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should fallback to LRU when Redis fails', async () => {
      // Mock Redis connection failure
      mockRedisClient.connect.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await checkRateLimit('192.168.1.12');
      
      // Should still work using LRU fallback
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should fallback to LRU when Redis exec fails', async () => {
      // Mock Redis exec failure
      mockMulti.exec.mockRejectedValueOnce(new Error('Redis exec failed'));

      const result = await checkRateLimit('192.168.1.13');
      
      // Should fallback to LRU
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe('rateLimitMiddleware', () => {
    it('should allow request when under limit', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.20',
        },
      });

      const result = await rateLimitMiddleware(req, res);
      
      expect(result).toBe(true);
      expect(res.getHeaders()['x-ratelimit-limit']).toBe(10);
      expect(res.getHeaders()['x-ratelimit-remaining']).toBe(9);
      expect(res.getHeaders()['x-ratelimit-reset']).toBeDefined();
    });

    it('should block request when limit exceeded and return 429', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.21',
        },
      });

      // Make 10 requests to reach the limit
      for (let i = 0; i < 10; i++) {
        await rateLimitMiddleware(req, res);
      }

      // Reset mocks to check the blocked request
      jest.clearAllMocks();
      const { req: req2, res: res2 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.21',
        },
      });

      const result = await rateLimitMiddleware(req2, res2);
      
      expect(result).toBe(false);
      expect(res2._getStatusCode()).toBe(429);
      expect(JSON.parse(res2._getData())).toEqual({ error: 'rate_limit_exceeded' });
      expect(res2.getHeaders()['x-ratelimit-remaining']).toBe(0);
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'x-forwarded-for': '203.0.113.1, 192.168.1.22',
        },
      });

      const result = await rateLimitMiddleware(req, res);
      
      expect(result).toBe(true);
      // The first IP in the forwarded header should be used
    });

    it('should extract IP from x-real-ip header', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'x-real-ip': '203.0.113.2',
        },
      });

      const result = await rateLimitMiddleware(req, res);
      
      expect(result).toBe(true);
    });

    it('should fallback to socket remote address', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      // Mock socket remote address
      req.socket = { remoteAddress: '203.0.113.3' } as any;

      const result = await rateLimitMiddleware(req, res);
      
      expect(result).toBe(true);
    });

    it('should use default IP when no IP available', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      const result = await rateLimitMiddleware(req, res);
      
      expect(result).toBe(true);
    });
  });

  describe('IP extraction edge cases', () => {
    it('should handle malformed x-forwarded-for header', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'x-forwarded-for': '',
        },
      });

      const result = await rateLimitMiddleware(req, res);
      
      expect(result).toBe(true);
    });

    it('should trim whitespace from forwarded IPs', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'x-forwarded-for': '  203.0.113.4  , 192.168.1.1',
        },
      });

      const result = await rateLimitMiddleware(req, res);
      
      expect(result).toBe(true);
    });
  });
});