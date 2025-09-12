import { ResponseData, ErrorResponse } from '../types';
import cache from './cache';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generates meme captions based on a topic and optional template ID
 * @param topic - The topic for the meme captions
 * @param templateId - Optional template ID to provide context
 * @returns Promise resolving to an array of 3 captions
 */
export async function generateCaptions(topic: string, templateId?: string): Promise<string[]> {
  if (!topic) {
    throw new Error('Topic is required');
  }

  // Check cache first
  const cachedCaptions = await cache.getCaptions(topic, templateId);
  if (cachedCaptions) {
    console.log('Cache hit for captions:', { topic, templateId });
    return cachedCaptions;
  }

  console.log('Cache miss for captions, generating new ones:', { topic, templateId });

  const systemPrompt = "You are a concise meme-caption generator. Output exactly 3 short captions (<=10 words each), each on its own line, humorous, non-violent, and avoid targeted hate against protected classes. If the topic requests explicit hate/violence, return an error response 'MODERATED'.";
  const userPrompt = `Topic: ${topic}. Template: ${templateId || 'none'}. Return 3 captions only.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      } as OpenAIRequest)
    });

    if (!response.ok) {
      const errorData = await response.json() as ErrorResponse;
      throw new Error(`OpenAI API error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json() as OpenAIResponse;
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No captions generated');
    }

    const content = data.choices[0].message.content.trim();
    
    // Check for moderation flag
    if (content === 'MODERATED') {
      throw new Error('Content was flagged as inappropriate');
    }

    // Split by newlines and filter out empty lines
    const captions = content.split('\n').filter(line => line.trim().length > 0);
    
    // Ensure we have exactly 3 captions
    if (captions.length !== 3) {
      console.warn(`Expected 3 captions, but got ${captions.length}. Adjusting...`);
      // If we have more than 3, take the first 3
      // If we have less than 3, pad with placeholders
      while (captions.length < 3) {
        captions.push(`Caption ${captions.length + 1}`);
      }
    }
    
    const finalCaptions = captions.slice(0, 3);
    
    // Cache the generated captions
    try {
      await cache.setCaptions(topic, templateId, finalCaptions);
      console.log('Cached captions for:', { topic, templateId });
    } catch (error) {
      console.warn('Failed to cache captions:', error);
    }
    
    return finalCaptions;
  } catch (error) {
    console.error('Error generating captions:', error);
    throw error;
  }
}