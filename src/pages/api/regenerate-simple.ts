import { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '../../lib/firebaseAdmin';
import { selectTemplate } from '../../lib/templates';
import { generateCaption } from '../../lib/gemini';
import { createMemeWithImgflip } from '../../lib/imgflip';

// Free token system constants
const FREE_TOKENS = 20;
const REFILL_INTERVAL_DAYS = 7;

interface RegenerateRequest {
  topic: string;
  language: string;
  usedTemplateIds: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, language = 'English', usedTemplateIds = [] }: RegenerateRequest = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user document and handle token refill if needed
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const now = new Date();
    let userData;
    
    if (!userDoc.exists) {
      // Create new user with free tokens
      userData = {
        email: decodedToken.email,
        tokens: FREE_TOKENS,
        createdAt: now,
        lastLogin: now,
        lastTokenRefill: now,
        totalTokensUsed: 0
      };
      await adminDb.collection('users').doc(userId).set(userData);
    } else {
      userData = userDoc.data();
      
      // Check if it's time for token refill
      const lastRefill = userData?.lastTokenRefill?.toDate() || userData?.createdAt?.toDate();
      const daysSinceRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRefill >= REFILL_INTERVAL_DAYS) {
        // Refill tokens to 20
        userData.tokens = FREE_TOKENS;
        await adminDb.collection('users').doc(userId).update({
          tokens: FREE_TOKENS,
          lastTokenRefill: now
        });
        console.log(`Tokens refilled for user ${userId}: ${FREE_TOKENS} tokens`);
      }
    }

    // Check if user has tokens
    if (!userData || userData.tokens < 1) {
      return res.status(402).json({ 
        error: 'No tokens remaining. Tokens refill every 7 days!',
        code: 'INSUFFICIENT_TOKENS'
      });
    }

    console.log(`Regenerating meme for user ${userId}, topic: "${topic}", language: ${language}`);

    // Select a different template (excluding used ones)
    const template = await selectTemplate(topic, usedTemplateIds);
    if (!template) {
      return res.status(404).json({ error: 'No suitable template found' });
    }

    // Generate caption
    const caption = await generateCaption(topic, language, template.name);
    if (!caption) {
      return res.status(500).json({ error: 'Failed to generate caption' });
    }

    // Create meme
    const memeUrl = await createMemeWithImgflip(
      template.id,
      caption.topText || '',
      caption.bottomText || ''
    );

    if (!memeUrl) {
      return res.status(500).json({ error: 'Failed to create meme' });
    }

    // Deduct 1 token and update usage statistics
    const newTokenCount = userData.tokens - 1;
    const totalUsed = (userData.totalTokensUsed || 0) + 1;
    
    await adminDb.collection('users').doc(userId).update({
      tokens: newTokenCount,
      totalTokensUsed: totalUsed,
      lastLogin: now
    });

    // Save meme to user's collection
    const memeDoc = {
      userId,
      topic,
      language,
      templateId: template.id,
      templateName: template.name,
      topText: caption.topText || '',
      bottomText: caption.bottomText || '',
      memeUrl,
      createdAt: now,
      isRegeneration: true
    };

    await adminDb.collection('memes').add(memeDoc);

    res.status(200).json({
      success: true,
      meme: {
        url: memeUrl,
        template: {
          id: template.id,
          name: template.name,
          url: template.url
        },
        caption: {
          topText: caption.topText,
          bottomText: caption.bottomText
        },
        topic,
        language
      },
      tokensRemaining: newTokenCount
    });

  } catch (error) {
    console.error('Error regenerating meme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}