import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '../../../lib/firebase-admin';
import { logTelemetry } from '../../../lib/telemetry';

interface AddFavoriteRequest {
  memeUrl: string;
  prompt: string;
  templateName?: string;
  caption?: string;
}

interface AddFavoriteResponse {
  success: boolean;
  message: string;
  favoriteId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddFavoriteResponse>
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

    const { memeUrl, prompt, templateName, caption }: AddFavoriteRequest = req.body;

    if (!memeUrl || !prompt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: memeUrl and prompt' 
      });
    }

    // Check if meme is already favorited
    const existingFavorite = await adminDb
      .collection('favorites')
      .where('userId', '==', userId)
      .where('memeUrl', '==', memeUrl)
      .get();

    if (!existingFavorite.empty) {
      return res.status(409).json({ 
        success: false, 
        message: 'Meme already in favorites' 
      });
    }

    // Add to favorites
    const favoriteData = {
      userId,
      memeUrl,
      prompt,
      templateName: templateName || null,
      caption: caption || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection('favorites').add(favoriteData);
    
    // Update user's favorite count
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      favoriteCount: adminDb.FieldValue.increment(1),
      updatedAt: new Date().toISOString()
    });

    logTelemetry('favorite_added', {
      userId,
      favoriteId: docRef.id,
      templateName: templateName || 'unknown'
    });

    res.status(200).json({
      success: true,
      message: 'Meme added to favorites',
      favoriteId: docRef.id
    });

  } catch (error) {
    console.error('Add favorite error:', error);
    logTelemetry('favorite_add_error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to add meme to favorites'
    });
  }
}