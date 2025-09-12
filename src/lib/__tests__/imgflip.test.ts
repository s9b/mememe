import { renderMeme } from '../imgflip';

// Store original fetch and environment variables
const originalFetch = global.fetch;
const originalEnv = process.env;

describe('renderMeme function', () => {
  beforeEach(() => {
    // Reset mock before each test
    jest.clearAllMocks();
    
    // Setup environment variables for tests
    process.env = {
      ...originalEnv,
      IMGFLIP_USER: 'test_user',
      IMGFLIP_PASS: 'test_password',
    };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should successfully generate a meme and return the URL', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          url: 'https://i.imgflip.com/123abc.jpg',
          page_url: 'https://imgflip.com/i/123abc',
        },
      }),
    });

    const result = await renderMeme('123456', 'Top text', 'Bottom text');
    
    // Check the result
    expect(result).toBe('https://i.imgflip.com/123abc.jpg');
    
    // Verify the API was called with correct parameters
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.imgflip.com/caption_image',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
  });

  it('should throw an error when template ID is not provided', async () => {
    await expect(renderMeme('', 'Top text')).rejects.toThrow('Template ID is required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw an error when no text is provided', async () => {
    await expect(renderMeme('123456', '')).rejects.toThrow('At least one text field (text0 or text1) is required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw an error when API credentials are missing', async () => {
    // Remove environment variables
    delete process.env.IMGFLIP_USER;
    delete process.env.IMGFLIP_PASS;

    await expect(renderMeme('123456', 'Top text')).rejects.toThrow(
      'Imgflip credentials not found. Please set IMGFLIP_USER and IMGFLIP_PASS environment variables.'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw an error when API returns an error', async () => {
    // Mock API error response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error_message: 'Invalid template_id',
      }),
    });

    await expect(renderMeme('invalid_id', 'Top text')).rejects.toThrow('Imgflip API error: Invalid template_id');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when API returns success but no URL', async () => {
    // Mock API response with missing URL
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {}
      }),
    });

    await expect(renderMeme('123456', 'Top text')).rejects.toThrow(
      'Imgflip API returned success but no image URL was found'
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when fetch fails', async () => {
    // Mock network error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(renderMeme('123456', 'Top text')).rejects.toThrow('Network error');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when HTTP response is not OK', async () => {
    // Mock HTTP error
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(renderMeme('123456', 'Top text')).rejects.toThrow('HTTP error! Status: 500');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should work with only text0 provided', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          url: 'https://i.imgflip.com/123abc.jpg',
        },
      }),
    });

    const result = await renderMeme('123456', 'Only top text');
    
    expect(result).toBe('https://i.imgflip.com/123abc.jpg');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});