import { NextApiRequest, NextApiResponse } from 'next';
import { getUserTokens, UserTokenData } from '../../../lib/firebase-admin';
import { rateLimitMiddleware } from '../../../lib/rateLimit';
import { 
  captureException, 
  addBreadcrumb, 
  setExtra,
  startTransaction,
  flushEvents 
} from '../../../lib/telemetry';

interface TokenResponse extends Partial<UserTokenData> {
  tokens: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * Get user's token balance and statistics
 * GET /api/user/tokens
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse | ErrorResponse>
) {
  const transaction = startTransaction('get-user-tokens', 'http.server');
  
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

    setExtra('user_id', userId);

    addBreadcrumb({
      message: 'Fetching user token data',
      category: 'api',
      level: 'info',
      data: { userId }
    });

    const tokens = await getUserTokens(userId);

    const response: TokenResponse = {
      tokens,
      // These would come from the full user record in a real implementation
      totalTokensPurchased: 0,
      totalTokensUsed: 0
    };

    await flushEvents(1000);
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching user tokens:', error);
    
    captureException(error as Error, {
      operation: 'get-user-tokens',
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
      error: 'Failed to fetch token balance',
      code: 'INTERNAL_ERROR'
    });
  }
}