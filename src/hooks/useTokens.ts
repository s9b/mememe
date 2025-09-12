/**
 * useTokens hook for token management
 * Handles token balance, decrementing, and purchase flow
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface UserTokenData {
  tokenCount: number;
  totalTokensUsed: number;
  totalTokensPurchased: number;
  isPremium: boolean;
  memesGenerated: number;
}

export interface UseTokensReturn {
  tokens: number;
  loading: boolean;
  error: string | null;
  canGenerate: boolean;
  decrementTokens: (count?: number) => Promise<boolean>;
  refreshTokens: () => void;
  userStats: UserTokenData | null;
}

/**
 * Custom hook for token management
 */
export const useTokens = (): UseTokensReturn => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<number>(0);
  const [userStats, setUserStats] = useState<UserTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setTokens(0);
      setUserStats(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    
    // Subscribe to real-time token updates
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      try {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const tokenData: UserTokenData = {
            tokenCount: data.tokenCount || 0,
            totalTokensUsed: data.totalTokensUsed || 0,
            totalTokensPurchased: data.totalTokensPurchased || 0,
            isPremium: data.isPremium || false,
            memesGenerated: data.memesGenerated || 0
          };
          
          setTokens(tokenData.tokenCount);
          setUserStats(tokenData);
          setError(null);
        } else {
          setTokens(0);
          setUserStats(null);
          setError('User data not found');
        }
      } catch (err) {
        console.error('Error reading user token data:', err);
        setError('Failed to load token data');
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error('Error subscribing to user tokens:', err);
      setError('Failed to connect to token service');
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  /**
   * Decrement user tokens (client-side update for immediate feedback)
   */
  const decrementTokens = async (count: number = 1): Promise<boolean> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }

    if (tokens < count) {
      setError(`Not enough tokens. You need ${count} tokens but only have ${tokens}.`);
      return false;
    }

    try {
      setError(null);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        tokenCount: increment(-count),
        totalTokensUsed: increment(count),
        memesGenerated: increment(1),
        lastActivity: serverTimestamp()
      });

      return true;
    } catch (err) {
      console.error('Error decrementing tokens:', err);
      setError('Failed to update tokens. Please try again.');
      return false;
    }
  };

  /**
   * Refresh token data (useful after purchases)
   */
  const refreshTokens = () => {
    if (!user?.uid) return;
    
    // The real-time listener will automatically update
    setError(null);
  };

  const canGenerate = tokens > 0 && !loading && !!user;

  return {
    tokens,
    loading,
    error,
    canGenerate,
    decrementTokens,
    refreshTokens,
    userStats
  };
};