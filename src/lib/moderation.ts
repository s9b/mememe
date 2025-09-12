/**
 * Moderation service using OpenAI's moderation API
 */

interface ModerationRequest {
  input: string;
}

interface ModerationCategory {
  sexual: boolean;
  hate: boolean;
  harassment: boolean;
  'self-harm': boolean;
  'sexual/minors': boolean;
  'hate/threatening': boolean;
  'violence/graphic': boolean;
  'self-harm/intent': boolean;
  'self-harm/instructions': boolean;
  'harassment/threatening': boolean;
  violence: boolean;
}

interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategory;
  category_scores: Record<keyof ModerationCategory, number>;
}

interface ModerationResponse {
  id: string;
  model: string;
  results: ModerationResult[];
}

interface ModerationOutput {
  flagged: boolean;
  reasons?: string[];
}

/**
 * Moderates text using OpenAI's moderation API
 * @param text - The text to moderate
 * @returns Promise resolving to an object with flagged status and optional reasons
 */
export async function moderateText(text: string): Promise<ModerationOutput> {
  if (!text || text.trim() === '') {
    return { flagged: false };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        input: text
      } as ModerationRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI Moderation API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as ModerationResponse;
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No moderation results returned');
    }

    const result = data.results[0];
    
    if (result.flagged) {
      // Extract the flagged categories
      const reasons = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);
      
      return {
        flagged: true,
        reasons
      };
    }
    
    return { flagged: false };
  } catch (error) {
    console.error('Error during content moderation:', error);
    
    // Check if it's a quota exceeded error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('exceeded your current quota')) {
      console.warn('OpenAI quota exceeded, allowing content to pass moderation check');
      // Return as not flagged to allow the app to continue working
      return { flagged: false };
    }
    
    // For other errors, re-throw
    throw error;
  }
}