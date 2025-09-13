import { NextApiRequest, NextApiResponse } from 'next';
import { getUserTokenHistory, TokenTransaction } from '../../../lib/firebase-admin';
import { rateLimitMiddleware } from '../../../lib/rateLimit';
import { 
  captureException, 
  addBreadcrumb, 
  setExtra,
  startTransaction,
  flushEvents 
} from '../../../lib/telemetry';

interface HistoryResponse {
  transactions: TokenTransaction[];
  totalCount: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * Get user's token transaction history
 * GET /api/user/token-history
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HistoryResponse | ErrorResponse>
) {
  const transaction = startTransaction('get-user-token-history', 'http.server');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apply rate limiting
    const rateLimitPassed = await rateLimitMiddleware(req, res);
    if (!rateLimitPassed) {
      return;
    }

    // Get userId from query parameter (in production, you'd get this from JWT/session)
    const userId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!userId || typeof userId !== 'string') {
      return res.status(401).json({ 
        error: 'User authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // Get limit from query params (default 50)
    const limit = parseInt(req.query.limit as string) || 50;
    if (limit > 100) {
      return res.status(400).json({
        error: 'Limit cannot exceed 100',
        code: 'INVALID_LIMIT'
      });
    }

    setExtra('user_id', userId);
    setExtra('limit', limit);

    addBreadcrumb({
      message: 'Fetching user token history',
      category: 'api',
      level: 'info',
      data: { userId, limit }
    });

    const transactions = await getUserTokenHistory(userId, limit);

    const response: HistoryResponse = {
      transactions,
      totalCount: transactions.length
    };

    await flushEvents(1000);
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching user token history:', error);
    
    captureException(error as Error, {
      operation: 'get-user-token-history',
      user_agent: req.headers['user-agent']
    });

    await flushEvents(1000);
    if (transaction && typeof transaction.setStatus === 'function') {
      transaction.setStatus('internal_error');
    }
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(500).json({ 
      error: 'Failed to fetch token history',
      code: 'INTERNAL_ERROR'
    });
  }
}