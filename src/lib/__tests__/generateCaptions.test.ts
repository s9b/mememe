import { generateCaptions } from '../generateCaptions';

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

describe('generateCaptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  it('should generate 3 captions successfully', async () => {
    // Mock successful response
    const mockCaptions = 'First funny caption\nSecond hilarious caption\nThird witty caption';
    const mockResponse = createMockResponse({
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: mockCaptions
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80
      }
    });

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await generateCaptions('funny cats', 'template123');

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key'
        }),
        body: expect.stringContaining('"model":"gpt-3.5-turbo"')
      })
    );

    // Verify the request body contains the correct prompts
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(requestBody.messages).toEqual([
      {
        role: 'system',
        content: expect.stringContaining('You are a concise meme-caption generator')
      },
      {
        role: 'user',
        content: 'Topic: funny cats. Template: template123. Return 3 captions only.'
      }
    ]);

    // Verify the result
    expect(result).toEqual([
      'First funny caption',
      'Second hilarious caption',
      'Third witty caption'
    ]);
  });

  it('should handle API errors gracefully', async () => {
    // Mock error response
    const mockResponse = createMockResponse(
      { error: 'Invalid API key' },
      false,
      401
    );

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(generateCaptions('funny cats')).rejects.toThrow('OpenAI API error');
  });

  it('should throw an error when topic is empty', async () => {
    await expect(generateCaptions('')).rejects.toThrow('Topic is required');
    // Verify fetch was not called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle moderated content', async () => {
    // Mock moderated response
    const mockResponse = createMockResponse({
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'MODERATED'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 10,
        total_tokens: 60
      }
    });

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(generateCaptions('violent content')).rejects.toThrow('Content was flagged as inappropriate');
  });

  it('should handle fewer than 3 captions returned', async () => {
    // Mock response with only 2 captions
    const mockResponse = createMockResponse({
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'First caption\nSecond caption'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 20,
        total_tokens: 70
      }
    });

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await generateCaptions('funny cats');

    // Should add a placeholder for the missing caption
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('First caption');
    expect(result[1]).toBe('Second caption');
    expect(result[2]).toBe('Caption 3');
  });

  it('should handle more than 3 captions returned', async () => {
    // Mock response with 4 captions
    const mockResponse = createMockResponse({
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'First caption\nSecond caption\nThird caption\nFourth caption'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 40,
        total_tokens: 90
      }
    });

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await generateCaptions('funny cats');

    // Should only take the first 3 captions
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('First caption');
    expect(result[1]).toBe('Second caption');
    expect(result[2]).toBe('Third caption');
  });

  it('should work without a templateId', async () => {
    // Mock successful response
    const mockResponse = createMockResponse({
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Caption one\nCaption two\nCaption three'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80
      }
    });

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await generateCaptions('funny cats');

    // Verify the request body contains the correct prompts with 'none' for template
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(requestBody.messages[1].content).toBe('Topic: funny cats. Template: none. Return 3 captions only.');

    // Verify the result
    expect(result).toEqual([
      'Caption one',
      'Caption two',
      'Caption three'
    ]);
  });
});