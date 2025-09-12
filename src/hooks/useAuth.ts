/**
 * useAuth hook for Firebase authentication
 * Provides authentication state and methods
 */

import { useEffect, useState } from 'react';
import { 
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  AuthError
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

export interface AuthUser extends User {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export interface AuthMethods {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export type UseAuthReturn = AuthState & AuthMethods;

/**
 * Custom hook for Firebase authentication
 * @returns Authentication state and methods
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Create user object
          const authUser: AuthUser = {
            ...firebaseUser,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            uid: firebaseUser.uid
          };

          setUser(authUser);

          // Create/update user document in Firestore
          await createOrUpdateUserDoc(authUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Create or update user document in Firestore
   */
  const createOrUpdateUserDoc = async (user: AuthUser) => {
    if (!user.uid) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp(),
    };

    if (userSnap.exists()) {
      // Update existing user
      await setDoc(userRef, userData, { merge: true });
    } else {
      // Create new user document with initial tokens
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        memesGenerated: 0,
        isPremium: false,
        tokenCount: 10, // Free tokens for new users
        totalTokensUsed: 0,
        totalTokensPurchased: 0,
        lastTokenGrant: serverTimestamp()
      });
    }
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with email and password
   */
  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up with email and password
   */
  const signUpWithEmail = async (
    email: string, 
    password: string, 
    displayName?: string
  ): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out user
   */
  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string): Promise<void> => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    resetPassword,
    clearError
  };
};

/**
 * Extract user-friendly error message from Firebase error
 */
function getErrorMessage(error: any): string {
  if (error?.code) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled.';
      default:
        return error.message || 'An error occurred during authentication.';
    }
  }
  return error?.message || 'An unknown error occurred.';
}