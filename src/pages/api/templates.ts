import type { NextApiRequest, NextApiResponse } from 'next';
import { getTrendingTemplates, MemeTemplate } from '../../lib/templates';

interface ResponseData {
  templates: MemeTemplate[];
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const templates = await getTrendingTemplates();
    res.status(200).json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
}
