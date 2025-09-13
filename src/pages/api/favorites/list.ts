import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '../../../lib/firebase-admin';
import { logTelemetry } from '../../../lib/telemetry';

interface Favorite {
  id: string;
  memeUrl: string;
  prompt: string;
  templateName?: string;
  caption?: string;
  createdAt: string;
}

interface ListFavoritesResponse {
  success: boolean;
  message: string;
  favorites?: Favorite[];
  total?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListFavoritesResponse>
) {
  if (req.method !== 'GET') {
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

    // Get pagination parameters
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Fetch user's favorites
    let query = adminDb
      .collection('favorites')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (offset > 0) {
      // For pagination, we'd need to use startAfter with a document snapshot
      // For now, using a simple skip-like approach
      query = query.offset(offset);
    }

    const favoritesSnapshot = await query.get();
    
    const favorites: Favorite[] = favoritesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Favorite[];

    // Get total count
    const totalSnapshot = await adminDb
      .collection('favorites')
      .where('userId', '==', userId)
      .get();

    logTelemetry('favorites_listed', {
      userId,
      count: favorites.length,
      total: totalSnapshot.size
    });

    res.status(200).json({
      success: true,
      message: 'Favorites retrieved successfully',
      favorites,
      total: totalSnapshot.size
    });

  } catch (error) {
    console.error('List favorites error:', error);
    logTelemetry('favorites_list_error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve favorites'
    });
  }
}