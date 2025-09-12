import axios from 'axios';
import cache from './cache';

/**
 * Interface for the renderMeme function parameters
 */
interface RenderMemeParams {
  templateId: string;
  text0: string;
  text1?: string;
}

interface ImgflipResponse {
  success: boolean;
  data: {
    url?: string;
    memes?: Array<{
      id: string;
      name: string;
      url: string;
      width: number;
      height: number;
      box_count: number;
    }>;
  };
  error_message?: string;
}

/**
 * Generate a meme using the Imgflip API
 * @param templateId The ID of the meme template
 * @param captions Array of captions for the meme
 * @returns URL of the generated meme
 */
export async function generateMeme(templateId: string, captions: string[]): Promise<string> {
  try {
    // Create form data for the API request
    const formData = new FormData();
    formData.append('template_id', templateId);
    formData.append('username', process.env.IMGFLIP_USER || '');
    formData.append('password', process.env.IMGFLIP_PASS || '');
    
    // Add captions to form data
    captions.forEach((text, index) => {
      formData.append(`boxes[${index}][text]`, text);
    });

    // Make API request to Imgflip
    const response = await axios.post<ImgflipResponse>('https://api.imgflip.com/caption_image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Check if the request was successful
    if (response.data.success) {
      return response.data.data.url || '';
    } else {
      throw new Error(response.data.error_message || 'Failed to generate meme');
    }
  } catch (error) {
    console.error('Error generating meme with Imgflip:', error);
    throw new Error('Failed to generate meme');
  }
}

/**
 * Get available meme templates from Imgflip API
 * @returns Array of meme templates
 */
export async function getTemplates() {
  try {
    const response = await axios.get<ImgflipResponse>('https://api.imgflip.com/get_memes');
    
    if (response.data.success && response.data.data.memes) {
      return response.data.data.memes;
    } else {
      throw new Error(response.data.error_message || 'Failed to fetch templates');
    }
  } catch (error) {
    console.error('Error fetching meme templates:', error);
    throw new Error('Failed to fetch meme templates');
  }
}

/**
 * Renders a meme using the Imgflip caption_image API
 * @param templateId - The Imgflip template ID
 * @param text0 - The top text for the meme
 * @param text1 - The bottom text for the meme (optional)
 * @returns Promise resolving to the URL of the generated meme image
 * @throws Error if the API request fails or returns an error
 */
export async function renderMeme(
  templateId: string,
  text0: string,
  text1?: string
): Promise<string> {
  // Validate inputs
  if (!templateId) {
    throw new Error('Template ID is required');
  }
  
  if (!text0 && !text1) {
    throw new Error('At least one text field (text0 or text1) is required');
  }

  // Check cache first
  const cachedImageUrl = await cache.getImageUrl(templateId, text0 || '', text1 || '');
  if (cachedImageUrl) {
    console.log('Cache hit for image:', { templateId, text0, text1 });
    return cachedImageUrl;
  }

  console.log('Cache miss for image, generating new one:', { templateId, text0, text1 });

  // Get credentials from environment variables
  const username = process.env.IMGFLIP_USER;
  const password = process.env.IMGFLIP_PASS;

  if (!username || !password) {
    throw new Error('Imgflip credentials not found. Please set IMGFLIP_USER and IMGFLIP_PASS environment variables.');
  }

  // Create form data
  const formData = new FormData();
  formData.append('template_id', templateId);
  formData.append('username', username);
  formData.append('password', password);
  formData.append('text0', text0 || '');
  
  if (text1) {
    formData.append('text1', text1);
  }

  try {
    // Make the API request
    const response = await fetch('https://api.imgflip.com/caption_image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json() as ImgflipResponse;

    // Check if the API request was successful
    if (!result.success) {
      throw new Error(`Imgflip API error: ${result.error_message || 'Unknown error'}`);
    }

    // Return the URL of the generated meme
    if (!result.data || !result.data.url) {
      throw new Error('Imgflip API returned success but no image URL was found');
    }

    const imageUrl = result.data.url;
    
    // Cache the generated image URL
    try {
      await cache.setImageUrl(templateId, text0 || '', text1 || '', imageUrl);
      console.log('Cached image URL for:', { templateId, text0, text1 });
    } catch (error) {
      console.warn('Failed to cache image URL:', error);
    }

    return imageUrl;
  } catch (error) {
    // Re-throw with a more descriptive message if it's not already an Error object
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Failed to generate meme: ${String(error)}`);
    }
  }
}