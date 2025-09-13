import { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '../../../lib/firebaseAdmin';

// Free token system: 20 tokens that refill every 7 days
const FREE_TOKENS = 20;
const REFILL_INTERVAL_DAYS = 7;

interface TokenResponse {
  tokens: number;
  email?: string;
  nextRefillDate: string;
  daysUntilRefill: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * Get user's token balance with automatic 7-day refill system
 * GET /api/user/tokens
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'User authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user document
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    const now = new Date();
    let userData;
    
    if (!userDoc.exists) {
      // Create new user with 20 free tokens
      userData = {
        email: decodedToken.email,
        tokens: FREE_TOKENS,
        createdAt: now,
        lastLogin: now,
        lastTokenRefill: now,
        totalTokensUsed: 0
      };
      
      await adminDb.collection('users').doc(userId).set(userData);
      console.log(`New user created with ${FREE_TOKENS} free tokens:`, userId);
    } else {
      userData = userDoc.data();
      
      // Check if it's time for token refill (7 days)
      const lastRefill = userData?.lastTokenRefill?.toDate() || userData?.createdAt?.toDate();
      const daysSinceRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRefill >= REFILL_INTERVAL_DAYS) {
        // Refill tokens to 20
        userData.tokens = FREE_TOKENS;
        userData.lastTokenRefill = now;
        
        await adminDb.collection('users').doc(userId).update({
          tokens: FREE_TOKENS,
          lastTokenRefill: now,
          lastLogin: now
        });
        
        console.log(`Tokens refilled for user ${userId}: ${FREE_TOKENS} tokens`);
      } else {
        // Just update last login
        await adminDb.collection('users').doc(userId).update({
          lastLogin: now
        });
      }
    }

    // Calculate days until next refill
    const lastRefill = userData.lastTokenRefill || userData.createdAt;
    const refillTime = lastRefill instanceof Date ? lastRefill : lastRefill.toDate();
    const nextRefillDate = new Date(refillTime.getTime() + (REFILL_INTERVAL_DAYS * 24 * 60 * 60 * 1000));
    const daysUntilRefill = Math.max(0, Math.ceil((nextRefillDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const response: TokenResponse = {
      tokens: userData.tokens || 0,
      email: userData.email,
      nextRefillDate: nextRefillDate.toISOString(),
      daysUntilRefill
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error getting user tokens:', error);
    
    return res.status(500).json({ 
      error: 'Failed to fetch token balance',
      code: 'INTERNAL_ERROR'
    });
  }
}
