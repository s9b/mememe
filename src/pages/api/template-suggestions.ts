import { NextApiRequest, NextApiResponse } from 'next';
import { getTemplateSuggestions, MemeTemplate } from '../../lib/templates';

interface SuggestionsRequest {
  topic: string;
  count?: number;
}

interface SuggestionsResponse {
  suggestions: MemeTemplate[];
  topic: string;
}

interface ErrorResponse {
  error: string;
}

/**
 * API route for getting meme template suggestions based on topic
 * GET /api/template-suggestions?topic=cats&count=5
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuggestionsResponse | ErrorResponse>
) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { topic, count } = req.query;

    // Validate input
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const suggestionCount = count ? parseInt(count as string, 10) : 5;
    if (isNaN(suggestionCount) || suggestionCount < 1 || suggestionCount > 20) {
      return res.status(400).json({ error: 'Count must be between 1 and 20' });
    }

    // Get template suggestions
    const suggestions = await getTemplateSuggestions(topic.trim(), suggestionCount);

    return res.status(200).json({
      suggestions,
      topic: topic.trim()
    });

  } catch (error) {
    console.error('Error in template-suggestions API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}