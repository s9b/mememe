import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { 
  captureException, 
  addBreadcrumb, 
  setExtra 
} from './telemetry';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  let serviceAccountKey;
  try {
    serviceAccountKey = JSON.parse(serviceAccount);
  } catch (error) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON format');
  }

  initializeApp({
    credential: cert(serviceAccountKey),
    databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccountKey.project_id}-default-rtdb.firebaseio.com`
  });
}

const db = getFirestore();

export { db };

export interface UserTokenData {
  userId: string;
  tokens: number;
  totalTokensPurchased: number;
  totalTokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenTransaction {
  userId: string;
  type: 'purchase' | 'usage' | 'refund';
  amount: number;
  description: string;
  packageId?: string;
  sessionId?: string;
  memeId?: string;
  timestamp: Date;
}

/**
 * Get user's current token balance
 */
export async function getUserTokens(userId: string): Promise<number> {
  try {
    addBreadcrumb({
      message: 'Fetching user tokens',
      category: 'database',
      level: 'info',
      data: { userId }
    });

    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Initialize user with 0 tokens if they don't exist
      const userData: Partial<UserTokenData> = {
        userId,
        tokens: 0,
        totalTokensPurchased: 0,
        totalTokensUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await userRef.set(userData);
      return 0;
    }

    const data = doc.data() as UserTokenData;
    return data.tokens || 0;

  } catch (error) {
    console.error('Error getting user tokens:', error);
    captureException(error as Error, {
      operation: 'get-user-tokens',
      user_id: userId
    });
    throw error;
  }
}

/**
 * Update user's token balance (add tokens from purchase)
 */
export async function updateUserTokens(userId: string, tokensToAdd: number): Promise<void> {
  try {
    addBreadcrumb({
      message: 'Updating user tokens',
      category: 'database',
      level: 'info',
      data: { userId, tokensToAdd }
    });

    setExtra('user_id', userId);
    setExtra('tokens_to_add', tokensToAdd);

    const userRef = db.collection('users').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      
      if (!doc.exists) {
        // Create new user record
        const userData: Partial<UserTokenData> = {
          userId,
          tokens: tokensToAdd,
          totalTokensPurchased: tokensToAdd,
          totalTokensUsed: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        transaction.set(userRef, userData);
      } else {
        // Update existing user record
        const currentData = doc.data() as UserTokenData;
        transaction.update(userRef, {
          tokens: (currentData.tokens || 0) + tokensToAdd,
          totalTokensPurchased: (currentData.totalTokensPurchased || 0) + tokensToAdd,
          updatedAt: new Date()
        });
      }
    });

    console.log(`Successfully added ${tokensToAdd} tokens to user ${userId}`);

  } catch (error) {
    console.error('Error updating user tokens:', error);
    captureException(error as Error, {
      operation: 'update-user-tokens',
      user_id: userId,
      tokens_to_add: tokensToAdd
    });
    throw error;
  }
}

/**
 * Consume tokens for meme generation
 */
export async function consumeUserTokens(userId: string, tokensToConsume: number, memeId?: string): Promise<boolean> {
  try {
    addBreadcrumb({
      message: 'Consuming user tokens',
      category: 'database',
      level: 'info',
      data: { userId, tokensToConsume, memeId }
    });

    setExtra('user_id', userId);
    setExtra('tokens_to_consume', tokensToConsume);

    const userRef = db.collection('users').doc(userId);
    
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      
      if (!doc.exists) {
        console.log(`User ${userId} not found, cannot consume tokens`);
        return false;
      }

      const currentData = doc.data() as UserTokenData;
      const currentTokens = currentData.tokens || 0;

      if (currentTokens < tokensToConsume) {
        console.log(`Insufficient tokens for user ${userId}: has ${currentTokens}, needs ${tokensToConsume}`);
        return false;
      }

      // Update user tokens
      transaction.update(userRef, {
        tokens: currentTokens - tokensToConsume,
        totalTokensUsed: (currentData.totalTokensUsed || 0) + tokensToConsume,
        updatedAt: new Date()
      });

      // Log the transaction
      const transactionData: TokenTransaction = {
        userId,
        type: 'usage',
        amount: tokensToConsume,
        description: `Meme generation${memeId ? ` (ID: ${memeId})` : ''}`,
        memeId,
        timestamp: new Date()
      };

      const transactionRef = db.collection('tokenTransactions').doc();
      transaction.set(transactionRef, transactionData);

      return true;
    });

  } catch (error) {
    console.error('Error consuming user tokens:', error);
    captureException(error as Error, {
      operation: 'consume-user-tokens',
      user_id: userId,
      tokens_to_consume: tokensToConsume
    });
    throw error;
  }
}

/**
 * Log token purchase transaction
 */
export async function logTokenTransaction(
  userId: string, 
  sessionId: string, 
  packageId: string, 
  tokensAdded: number
): Promise<void> {
  try {
    const transactionData: TokenTransaction = {
      userId,
      type: 'purchase',
      amount: tokensAdded,
      description: `Token purchase - Package ${packageId}`,
      packageId,
      sessionId,
      timestamp: new Date()
    };

    await db.collection('tokenTransactions').add(transactionData);
    
    addBreadcrumb({
      message: 'Token transaction logged',
      category: 'database',
      level: 'info',
      data: { userId, sessionId, packageId, tokensAdded }
    });

  } catch (error) {
    console.error('Error logging token transaction:', error);
    captureException(error as Error, {
      operation: 'log-token-transaction',
      user_id: userId,
      session_id: sessionId
    });
    throw error;
  }
}

/**
 * Get user's token transaction history
 */
export async function getUserTokenHistory(userId: string, limit: number = 50): Promise<TokenTransaction[]> {
  try {
    const snapshot = await db
      .collection('tokenTransactions')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TokenTransaction & { id: string }));

  } catch (error) {
    console.error('Error getting user token history:', error);
    captureException(error as Error, {
      operation: 'get-user-token-history',
      user_id: userId
    });
    throw error;
  }
}

/**
 * Check if user has sufficient tokens
 */
export async function hasUserSufficientTokens(userId: string, requiredTokens: number): Promise<boolean> {
  try {
    const currentTokens = await getUserTokens(userId);
    return currentTokens >= requiredTokens;
  } catch (error) {
    console.error('Error checking user token sufficiency:', error);
    captureException(error as Error, {
      operation: 'check-user-token-sufficiency',
      user_id: userId,
      required_tokens: requiredTokens
    });
    return false;
  }
}