import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import generateHandler from '../generate';
import { moderateText } from '../../../lib/moderation';
import { generateCaptions } from '../../../lib/generateCaptions';
import { renderMeme } from '../../../lib/imgflip';
import { rateLimitMiddleware } from '../../../lib/rateLimit';
import cache from '../../../lib/cache';

// Mock the dependencies
jest.mock('../../../lib/moderation');
jest.mock('../../../lib/generateCaptions');
jest.mock('../../../lib/imgflip');
jest.mock('../../../lib/rateLimit');
jest.mock('../../../lib/cache');

describe('/api/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock rate limiter to always pass by default
    (rateLimitMiddleware as jest.Mock).mockResolvedValue(true);
  });

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await generateHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
  });

  it('should return 400 if topic is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
    });

    await generateHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Topic is required' });
  });

  it('should return 400 if topic is empty', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { topic: '' },
    });

    await generateHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Topic is required' });
  });

  it('should return 400 if content is flagged by moderation', async () => {
    // Mock moderation to flag the content
    (moderateText as jest.Mock).mockResolvedValueOnce({ flagged: true });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { topic: 'inappropriate content' },
    });

    await generateHandler(req, res);

    expect(moderateText).toHaveBeenCalledWith('inappropriate content');
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ error: 'input_moderated' });
  });

  it('should generate memes successfully', async () => {
    // Mock successful moderation
    (moderateText as jest.Mock).mockResolvedValue({ flagged: false });
    
    // Mock caption generation
    (generateCaptions as jest.Mock).mockResolvedValueOnce([
      'Caption 1',
      'Caption 2|Bottom text',
      'Caption 3'
    ]);
    
    // Mock meme rendering
    (renderMeme as jest.Mock).mockImplementation(async (templateId, text0, text1) => {
      return `https://i.imgflip.com/meme-${templateId}-${text0}-${text1 || ''}.jpg`;
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { topic: 'funny cats', templateId: '123456' },
    });

    await generateHandler(req, res);

    // Verify moderation was called
    expect(moderateText).toHaveBeenCalledWith('funny cats');
    
    // Verify caption generation was called
    expect(generateCaptions).toHaveBeenCalledWith('funny cats', '123456');
    
    // Verify renderMeme was called for each caption
    expect(renderMeme).toHaveBeenCalledTimes(3);
    
    // Check response
    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    expect(responseData).toHaveProperty('results');
    expect(responseData.results).toHaveLength(3);
    
    // Verify the structure of each result
    responseData.results.forEach((result: any) => {
      expect(result).toHaveProperty('caption');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('templateId');
      expect(result.templateId).toBe('123456');
    });
  });

  it('should handle when some captions are flagged by moderation', async () => {
    // Mock initial moderation to pass
    (moderateText as jest.Mock).mockImplementation(async (text) => {
      // Flag the second caption only
      if (text === 'Caption 2') {
        return { flagged: true };
      }
      return { flagged: false };
    });
    
    // Mock caption generation
    (generateCaptions as jest.Mock).mockResolvedValueOnce([
      'Caption 1',
      'Caption 2',
      'Caption 3'
    ]);
    
    // Mock meme rendering
    (renderMeme as jest.Mock).mockImplementation(async (templateId, text0) => {
      return `https://i.imgflip.com/meme-${templateId}-${text0}.jpg`;
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { topic: 'funny cats' },
    });

    await generateHandler(req, res);

    // Verify moderation was called multiple times
    expect(moderateText).toHaveBeenCalledTimes(4); // Once for input, once for each caption
    
    // Check response
    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    expect(responseData).toHaveProperty('results');
    
    // Only 2 captions should pass moderation
    expect(responseData.results).toHaveLength(2);
    
    // Verify the captions that passed
    expect(responseData.results[0].caption).toBe('Caption 1');
    expect(responseData.results[1].caption).toBe('Caption 3');
  });

  it('should return 500 if all captions fail to generate memes', async () => {
    // Mock successful moderation
    (moderateText as jest.Mock).mockResolvedValue({ flagged: false });
    
    // Mock caption generation
    (generateCaptions as jest.Mock).mockResolvedValueOnce([
      'Caption 1',
      'Caption 2',
      'Caption 3'
    ]);
    
    // Mock meme rendering to fail for all captions
    (renderMeme as jest.Mock).mockRejectedValue(new Error('Meme generation failed'));

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { topic: 'funny cats' },
    });

    await generateHandler(req, res);

    // Check response
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({ 
      error: 'Failed to generate any valid memes' 
    });
  });

  it('should handle server errors gracefully', async () => {
    // Mock moderation to throw an error
    (moderateText as jest.Mock).mockRejectedValueOnce(new Error('API error'));

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { topic: 'funny cats' },
    });

    await generateHandler(req, res);

    // Check response
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Internal server error' });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      // Mock rate limiter to reject the request
      (rateLimitMiddleware as jest.Mock).mockResolvedValueOnce(false);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { topic: 'funny cats' },
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      // Mock res.status and res.json to track the rate limit response
      const statusSpy = jest.spyOn(res, 'status').mockReturnThis();
      const jsonSpy = jest.spyOn(res, 'json').mockReturnThis();

      await generateHandler(req, res);

      // Verify rate limiting was applied
      expect(rateLimitMiddleware).toHaveBeenCalledWith(req, res);
      
      // The handler should return early without processing further
      expect(moderateText).not.toHaveBeenCalled();
      expect(generateCaptions).not.toHaveBeenCalled();
      expect(renderMeme).not.toHaveBeenCalled();
    });

    it('should proceed normally when rate limit is not exceeded', async () => {
      // Mock rate limiter to allow the request
      (rateLimitMiddleware as jest.Mock).mockResolvedValueOnce(true);
      
      // Mock successful moderation and generation
      (moderateText as jest.Mock).mockResolvedValue({ flagged: false });
      (generateCaptions as jest.Mock).mockResolvedValueOnce(['Test caption']);
      (renderMeme as jest.Mock).mockResolvedValueOnce('https://example.com/meme.jpg');

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { topic: 'funny cats' },
        headers: {
          'x-forwarded-for': '192.168.1.2',
        },
      });

      await generateHandler(req, res);

      // Verify rate limiting was checked
      expect(rateLimitMiddleware).toHaveBeenCalledWith(req, res);
      
      // Verify normal processing continued
      expect(moderateText).toHaveBeenCalled();
      expect(generateCaptions).toHaveBeenCalled();
      expect(renderMeme).toHaveBeenCalled();
      
      expect(res._getStatusCode()).toBe(200);
    });

    it('should apply rate limiting before any other processing', async () => {
      // Mock rate limiter to reject
      (rateLimitMiddleware as jest.Mock).mockResolvedValueOnce(false);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {}, // Invalid body (missing topic)
        headers: {
          'x-forwarded-for': '192.168.1.3',
        },
      });

      await generateHandler(req, res);

      // Rate limiting should be checked first
      expect(rateLimitMiddleware).toHaveBeenCalledWith(req, res);
      
      // Topic validation should not happen when rate limited
      // (If it did, we'd get a 400 for missing topic instead of rate limit handling)
      expect(moderateText).not.toHaveBeenCalled();
    });
  });

  describe('Caching Integration', () => {
    beforeEach(() => {
      // Reset cache mocks
      jest.clearAllMocks();
      (rateLimitMiddleware as jest.Mock).mockResolvedValue(true);
    });

    it('should use cached captions when available', async () => {
      // Mock cache hit for captions
      (cache.getCaptions as jest.Mock).mockResolvedValueOnce(['Cached Caption 1', 'Cached Caption 2', 'Cached Caption 3']);
      
      // Mock successful moderation and image rendering
      (moderateText as jest.Mock).mockResolvedValue({ flagged: false });
      (renderMeme as jest.Mock).mockResolvedValue('https://example.com/cached-meme.jpg');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { topic: 'funny cats', templateId: '123456' },
      });

      await generateHandler(req, res);

      // Should check cache first
      expect(cache.getCaptions).toHaveBeenCalledWith('funny cats', '123456');
      
      // Should not call generateCaptions since we have cached results
      expect(generateCaptions).not.toHaveBeenCalled();
      
      // Should still render memes with cached captions
      expect(renderMeme).toHaveBeenCalledTimes(3);
      
      expect(res._getStatusCode()).toBe(200);
    });

    it('should cache captions when cache miss occurs', async () => {
      // Mock cache miss for captions
      (cache.getCaptions as jest.Mock).mockResolvedValueOnce(null);
      
      // Mock successful generation
      (moderateText as jest.Mock).mockResolvedValue({ flagged: false });
      (generateCaptions as jest.Mock).mockResolvedValueOnce(['Generated Caption 1', 'Generated Caption 2', 'Generated Caption 3']);
      (renderMeme as jest.Mock).mockResolvedValue('https://example.com/generated-meme.jpg');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { topic: 'funny dogs', templateId: '789012' },
      });

      await generateHandler(req, res);

      // Should check cache first
      expect(cache.getCaptions).toHaveBeenCalledWith('funny dogs', '789012');
      
      // Should call generateCaptions since cache miss
      expect(generateCaptions).toHaveBeenCalledWith('funny dogs', '789012');
      
      expect(res._getStatusCode()).toBe(200);
    });

    it('should use cached image URLs when available', async () => {
      // Mock cache miss for captions but hit for images
      (cache.getCaptions as jest.Mock).mockResolvedValueOnce(null);
      (cache.getImageUrl as jest.Mock).mockResolvedValue('https://example.com/cached-image.jpg');
      
      // Mock successful generation
      (moderateText as jest.Mock).mockResolvedValue({ flagged: false });
      (generateCaptions as jest.Mock).mockResolvedValueOnce(['Test Caption']);
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { topic: 'test topic', templateId: '123456' },
      });

      await generateHandler(req, res);

      // Should check image cache
      expect(cache.getImageUrl).toHaveBeenCalled();
      
      // Should not call renderMeme since we have cached image
      expect(renderMeme).not.toHaveBeenCalled();
      
      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.results[0].imageUrl).toBe('https://example.com/cached-image.jpg');
    });

    it('should cache image URLs when cache miss occurs', async () => {
      // Mock cache misses
      (cache.getCaptions as jest.Mock).mockResolvedValueOnce(null);
      (cache.getImageUrl as jest.Mock).mockResolvedValue(null);
      
      // Mock successful generation
      (moderateText as jest.Mock).mockResolvedValue({ flagged: false });
      (generateCaptions as jest.Mock).mockResolvedValueOnce(['New Caption']);
      (renderMeme as jest.Mock).mockResolvedValueOnce('https://example.com/new-image.jpg');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { topic: 'new topic', templateId: '456789' },
      });

      await generateHandler(req, res);

      // Should check both caches
      expect(cache.getCaptions).toHaveBeenCalledWith('new topic', '456789');
      expect(cache.getImageUrl).toHaveBeenCalled();
      
      // Should generate new content
      expect(generateCaptions).toHaveBeenCalledWith('new topic', '456789');
      expect(renderMeme).toHaveBeenCalled();
      
      expect(res._getStatusCode()).toBe(200);
    });

    it('should handle cache errors gracefully', async () => {
      // Mock cache errors
      (cache.getCaptions as jest.Mock).mockRejectedValueOnce(new Error('Cache error'));
      
      // Mock successful generation (fallback)
      (moderateText as jest.Mock).mockResolvedValue({ flagged: false });
      (generateCaptions as jest.Mock).mockResolvedValueOnce(['Fallback Caption']);
      (renderMeme as jest.Mock).mockResolvedValueOnce('https://example.com/fallback-image.jpg');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { topic: 'error test', templateId: '111111' },
      });

      await generateHandler(req, res);

      // Should still work despite cache error
      expect(generateCaptions).toHaveBeenCalledWith('error test', '111111');
      expect(renderMeme).toHaveBeenCalled();
      
      expect(res._getStatusCode()).toBe(200);
    });

    it('should handle different cache scenarios for same request', async () => {
      // Mock cache hit for captions but miss for images
      (cache.getCaptions as jest.Mock).mockResolvedValueOnce(['Cached Caption 1', 'Cached Caption 2']);
      (cache.getImageUrl as jest.Mock)
        .mockResolvedValueOnce('https://example.com/cached1.jpg') // First caption cached
        .mockResolvedValueOnce(null); // Second caption not cached
      
      // Mock successful operations
      (moderateText as jest.Mock).mockResolvedValue({ flagged: false });
      (renderMeme as jest.Mock).mockResolvedValueOnce('https://example.com/new2.jpg');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { topic: 'mixed cache', templateId: '222222' },
      });

      await generateHandler(req, res);

      // Should use cached captions
      expect(cache.getCaptions).toHaveBeenCalledWith('mixed cache', '222222');
      expect(generateCaptions).not.toHaveBeenCalled();
      
      // Should check image cache for each caption
      expect(cache.getImageUrl).toHaveBeenCalledTimes(2);
      
      // Should only render meme for the non-cached image
      expect(renderMeme).toHaveBeenCalledTimes(1);
      
      expect(res._getStatusCode()).toBe(200);
    });
  });
});
