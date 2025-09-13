import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '../../../lib/firebase-admin';
import { logTelemetry } from '../../../lib/telemetry';

interface RemoveFavoriteRequest {
  memeUrl: string;
}

interface RemoveFavoriteResponse {
  success: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RemoveFavoriteResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No auth token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const { memeUrl }: RemoveFavoriteRequest = req.body;

    if (!memeUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required field: memeUrl' 
      });
    }

    // Find and remove the favorite
    const favoriteQuery = await adminDb
      .collection('favorites')
      .where('userId', '==', userId)
      .where('memeUrl', '==', memeUrl)
      .get();

    if (favoriteQuery.empty) {
      return res.status(404).json({ 
        success: false, 
        message: 'Favorite not found' 
      });
    }

    // Delete the favorite document
    await favoriteQuery.docs[0].ref.delete();
    
    // Update user's favorite count
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      favoriteCount: adminDb.FieldValue.increment(-1),
      updatedAt: new Date().toISOString()
    });

    logTelemetry('favorite_removed', {
      userId,
      favoriteId: favoriteQuery.docs[0].id
    });

    res.status(200).json({
      success: true,
      message: 'Meme removed from favorites'
    });

  } catch (error) {
    console.error('Remove favorite error:', error);
    logTelemetry('favorite_remove_error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to remove meme from favorites'
    });
  }
}