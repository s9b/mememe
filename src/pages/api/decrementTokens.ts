import { NextApiRequest, NextApiResponse } from 'next';
import { doc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { rateLimitMiddleware } from '../../lib/rateLimit';
import { 
  captureException, 
  addBreadcrumb, 
  setExtra,
  startTransaction,
  trackEvent,
  flushEvents 
} from '../../lib/telemetry';

interface DecrementTokensRequest {
  userId: string;
  count?: number;
  operation?: string; // What the tokens are being used for
}

interface DecrementTokensResponse {
  success: boolean;
  newTokenCount: number;
  message?: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * API route for server-side token decrementing
 * POST /api/decrementTokens
 * Body: { userId: string, count?: number, operation?: string }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DecrementTokensResponse | ErrorResponse>
) {
  const transaction = startTransaction('decrement-tokens', 'http.server');
  
  addBreadcrumb({
    message: 'Token decrement request started',
    category: 'api',
    level: 'info',
    data: {
      method: req.method,
      userAgent: req.headers['user-agent']
    }
  });

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Apply rate limiting
    const rateLimitPassed = await rateLimitMiddleware(req, res);
    if (!rateLimitPassed) {
      trackEvent('rate_limit_exceeded', {
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      });
      return;
    }

    const { userId, count = 1, operation = 'meme_generation' } = req.body as DecrementTokensRequest;

    // Set request context
    setExtra('request_user_id', userId);
    setExtra('token_count', count);
    setExtra('operation', operation);

    // Validate input
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ 
        error: 'User ID is required',
        code: 'INVALID_USER_ID'
      });
    }

    if (count < 1 || count > 10) {
      return res.status(400).json({ 
        error: 'Token count must be between 1 and 10',
        code: 'INVALID_TOKEN_COUNT'
      });
    }

    addBreadcrumb({
      message: 'Input validation passed',
      category: 'validation',
      level: 'info',
      data: { userId, count, operation }
    });

    // Get user document reference
    const userRef = doc(db, 'users', userId);
    
    // First, check current token balance
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      addBreadcrumb({
        message: 'User document not found',
        category: 'validation',
        level: 'error',
        data: { userId }
      });
      
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = userSnap.data();
    const currentTokens = userData.tokenCount || 0;

    // Check if user has enough tokens
    if (currentTokens < count) {
      addBreadcrumb({
        message: 'Insufficient tokens',
        category: 'validation',
        level: 'warning',
        data: { 
          userId, 
          currentTokens, 
          requestedCount: count,
          shortfall: count - currentTokens
        }
      });

      trackEvent('token_insufficient', {
        userId,
        currentTokens,
        requestedCount: count,
        operation
      });

      return res.status(400).json({ 
        error: `Insufficient tokens. You have ${currentTokens} tokens but need ${count}.`,
        code: 'INSUFFICIENT_TOKENS'
      });
    }

    // Update tokens atomically
    await updateDoc(userRef, {
      tokenCount: increment(-count),
      totalTokensUsed: increment(count),
      memesGenerated: increment(operation === 'meme_generation' ? 1 : 0),
      lastActivity: serverTimestamp(),
      lastTokenUse: serverTimestamp()
    });

    const newTokenCount = currentTokens - count;

    addBreadcrumb({
      message: 'Tokens decremented successfully',
      category: 'success',
      level: 'info',
      data: { 
        userId, 
        previousTokens: currentTokens,
        newTokenCount,
        decrementedBy: count,
        operation
      }
    });

    // Track successful token usage
    trackEvent('tokens_decremented', {
      userId,
      count,
      operation,
      newTokenCount,
      previousTokenCount: currentTokens
    });

    // Special tracking for different operations
    if (operation === 'meme_generation') {
      trackEvent('meme_generated_with_tokens', {
        userId,
        tokensUsed: count,
        remainingTokens: newTokenCount
      });
    }

    await flushEvents(1000);
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(200).json({ 
      success: true,
      newTokenCount,
      message: `Successfully used ${count} token${count > 1 ? 's' : ''}. You have ${newTokenCount} tokens remaining.`
    });

  } catch (error) {
    console.error('Error in decrementTokens API:', error);
    
    captureException(error as Error, {
      operation: 'token-decrement',
      request_body: req.body,
      user_agent: req.headers['user-agent']
    });

    addBreadcrumb({
      message: 'Unhandled error in token decrement API',
      category: 'error',
      level: 'fatal',
      data: {
        error: (error as Error).message,
        stack: (error as Error).stack?.substring(0, 500)
      }
    });

    trackEvent('token_decrement_error', {
      error_type: 'unhandled_exception',
      error_message: (error as Error).message
    });

    await flushEvents(1000);
    if (transaction && typeof transaction.setStatus === 'function') {
      transaction.setStatus('internal_error');
    }
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}