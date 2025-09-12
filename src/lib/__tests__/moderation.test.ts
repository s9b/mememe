import { moderateText } from '../moderation';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to create mock responses
const createMockResponse = (body: any, ok = true, status = 200) => {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(body)
  };
};

describe('moderateText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  it('should return not flagged for clean content', async () => {
    // Mock successful response with no flags
    const mockResponse = createMockResponse({
      id: 'modr-123',
      model: 'text-moderation-latest',
      results: [
        {
          flagged: false,
          categories: {
            sexual: false,
            hate: false,
            harassment: false,
            'self-harm': false,
            'sexual/minors': false,
            'hate/threatening': false,
            'violence/graphic': false,
            'self-harm/intent': false,
            'self-harm/instructions': false,
            'harassment/threatening': false,
            violence: false
          },
          category_scores: {
            sexual: 0.0001,
            hate: 0.0001,
            harassment: 0.0001,
            'self-harm': 0.0001,
            'sexual/minors': 0.0001,
            'hate/threatening': 0.0001,
            'violence/graphic': 0.0001,
            'self-harm/intent': 0.0001,
            'self-harm/instructions': 0.0001,
            'harassment/threatening': 0.0001,
            violence: 0.0001
          }
        }
      ]
    });

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await moderateText('This is a friendly message');

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/moderations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key'
        }),
        body: expect.stringContaining('"input":"This is a friendly message"')
      })
    );

    // Verify the result
    expect(result).toEqual({
      flagged: false
    });
  });

  it('should return flagged with reasons for inappropriate content', async () => {
    // Mock response with flagged content
    const mockResponse = createMockResponse({
      id: 'modr-456',
      model: 'text-moderation-latest',
      results: [
        {
          flagged: true,
          categories: {
            sexual: false,
            hate: true,
            harassment: true,
            'self-harm': false,
            'sexual/minors': false,
            'hate/threatening': false,
            'violence/graphic': false,
            'self-harm/intent': false,
            'self-harm/instructions': false,
            'harassment/threatening': true,
            violence: false
          },
          category_scores: {
            sexual: 0.0001,
            hate: 0.88,
            harassment: 0.92,
            'self-harm': 0.0001,
            'sexual/minors': 0.0001,
            'hate/threatening': 0.22,
            'violence/graphic': 0.0001,
            'self-harm/intent': 0.0001,
            'self-harm/instructions': 0.0001,
            'harassment/threatening': 0.86,
            violence: 0.05
          }
        }
      ]
    });

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await moderateText('Some inappropriate content');

    // Verify the result
    expect(result).toEqual({
      flagged: true,
      reasons: ['hate', 'harassment', 'harassment/threatening']
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock error response
    const mockResponse = createMockResponse(
      { error: { message: 'Invalid API key' } },
      false,
      401
    );

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(moderateText('Test content')).rejects.toThrow('OpenAI Moderation API error');
  });

  it('should handle empty text input', async () => {
    const result = await moderateText('');
    
    // Should return not flagged without making API call
    expect(result).toEqual({ flagged: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle missing results in response', async () => {
    // Mock response with no results
    const mockResponse = createMockResponse({
      id: 'modr-789',
      model: 'text-moderation-latest',
      results: []
    });

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(moderateText('Test content')).rejects.toThrow('No moderation results returned');
  });

  it('should handle network errors', async () => {
    // Mock network error
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(moderateText('Test content')).rejects.toThrow('Network error');
  });
});