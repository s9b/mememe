import type { NextApiRequest, NextApiResponse } from 'next';
import templates from '../../data/templates.json';
import type { Template } from '../../types/templates';

interface ResponseData {
  templates: Array<Template>;
}

interface ErrorResponse {
  error: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.status(200).json({ templates: templates.templates as Array<Template> });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
}