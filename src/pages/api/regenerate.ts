import { NextApiRequest, NextApiResponse } from 'next';
import { moderateWithGemini } from '../../lib/gemini';
import { renderMeme } from '../../lib/imgflip';
import { getCombinedTrendingTemplates, selectSmartTemplate } from '../../lib/templates';
import { rateLimitMiddleware } from '../../lib/rateLimit';
import { hasUserSufficientTokens, consumeUserTokens } from '../../lib/firebase-admin';
import { 
  captureException, 
  addBreadcrumb, 
  setExtra,
  startTransaction,
  trackEvent,
  flushEvents 
} from '../../lib/telemetry';

// Token cost for meme regeneration
const MEME_REGENERATION_TOKEN_COST = 1;

interface RegenerateRequest {
  topic: string;
  captions: string[];
  usedTemplateIds?: string[];
  userId?: string;
}

interface RegenerateResult {
  caption: string;
  imageUrl: string;
  templateId: string;
  templateName?: string;
}

interface RegenerateResponse {
  results: RegenerateResult[];
  newTemplateId: string;
  templateName: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
  requiredTokens?: number;
}

/**
 * API route for regenerating memes with a different template
 * POST /api/regenerate
 * Body: { topic: string, captions: string[], usedTemplateIds?: string[] }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegenerateResponse | ErrorResponse>
) {
  const transaction = startTransaction('meme-regeneration', 'http.server');
  
  addBreadcrumb({
    message: 'Meme regeneration request started',
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

    const { topic, captions, usedTemplateIds = [], userId } = req.body as RegenerateRequest;

    // Set request context
    setExtra('request_topic', topic);
    setExtra('used_templates', usedTemplateIds);
    setExtra('request_user_id', userId);

    // Validate input
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    if (!captions || !Array.isArray(captions) || captions.length === 0) {
      return res.status(400).json({ error: 'Captions are required' });
    }

    // Token validation and consumption (if userId provided)
    if (userId) {
      const hasSufficientTokens = await hasUserSufficientTokens(userId, MEME_REGENERATION_TOKEN_COST);
      if (!hasSufficientTokens) {
        addBreadcrumb({
          message: 'Request rejected - insufficient tokens for regeneration',
          category: 'tokens',
          level: 'warning',
          data: { userId, requiredTokens: MEME_REGENERATION_TOKEN_COST }
        });
        trackEvent('insufficient_tokens_regeneration', {
          userId,
          requiredTokens: MEME_REGENERATION_TOKEN_COST
        });
        return res.status(402).json({ 
          error: 'Insufficient tokens', 
          code: 'INSUFFICIENT_TOKENS',
          requiredTokens: MEME_REGENERATION_TOKEN_COST
        });
      }
      
      addBreadcrumb({
        message: 'Token validation passed for regeneration',
        category: 'tokens',
        level: 'info',
        data: { userId, requiredTokens: MEME_REGENERATION_TOKEN_COST }
      });
    }

    addBreadcrumb({
      message: 'Input validation passed for regeneration',
      category: 'validation',
      level: 'info'
    });

    // Get available templates and select a new one
    const availableTemplates = await getCombinedTrendingTemplates();
    const newTemplateId = await selectSmartTemplate(topic, availableTemplates, true, usedTemplateIds);
    
    const selectedTemplate = availableTemplates.find(t => t.id === newTemplateId);
    const templateName = selectedTemplate?.name || 'Unknown Template';

    addBreadcrumb({
      message: `Selected new template: ${templateName} (${newTemplateId})`,
      category: 'template-selection',
      level: 'info',
      data: { templateId: newTemplateId, excludedIds: usedTemplateIds }
    });

    // Regenerate memes with the new template
    const results: RegenerateResult[] = [];
    let successfulGenerations = 0;

    for (const caption of captions) {
      try {
        // Split caption into top and bottom text
        const [captionTop, captionBottom] = caption.includes('|') 
          ? caption.split('|').map(part => part.trim())
          : [caption, ''];

        // Quick moderation check
        const moderationResult = await moderateWithGemini(caption);
        if (moderationResult.flagged) {
          continue; // Skip flagged captions
        }

        // Generate meme with new template
        const imageUrl = await renderMeme(newTemplateId, captionTop, captionBottom);

        results.push({
          caption,
          imageUrl,
          templateId: newTemplateId,
          templateName
        });
        
        successfulGenerations++;

        addBreadcrumb({
          message: 'Meme regenerated successfully',
          category: 'meme-regeneration',
          level: 'info',
          data: { 
            caption: caption.substring(0, 30),
            templateId: newTemplateId
          }
        });

      } catch (error) {
        console.error(`Error regenerating meme for caption: ${caption}`, error);
        
        captureException(error as Error, {
          caption: caption.substring(0, 50),
          templateId: newTemplateId,
          operation: 'meme-regeneration'
        });
      }
    }

    if (results.length === 0) {
      trackEvent('regeneration_failed', {
        topic: topic.substring(0, 50),
        reason: 'no_valid_memes',
        usedTemplates: usedTemplateIds.length
      });
      
      await flushEvents(1000);
      if (transaction && typeof transaction.finish === 'function') {
        transaction.finish();
      }
      
      return res.status(500).json({ error: 'Failed to regenerate any valid memes' });
    }

    // Consume tokens if regeneration was successful and user provided
    if (userId && results.length > 0) {
      try {
        const memeId = `regenerate_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const tokenConsumed = await consumeUserTokens(userId, MEME_REGENERATION_TOKEN_COST, memeId);
        
        if (tokenConsumed) {
          addBreadcrumb({
            message: 'Tokens consumed successfully for regeneration',
            category: 'tokens',
            level: 'info',
            data: { 
              userId, 
              tokensConsumed: MEME_REGENERATION_TOKEN_COST, 
              memeId 
            }
          });
          trackEvent('tokens_consumed_regeneration', {
            userId,
            tokensConsumed: MEME_REGENERATION_TOKEN_COST,
            memeId,
            regeneratedMemes: results.length,
            newTemplateId
          });
        }
      } catch (error) {
        console.error('Error consuming tokens for regeneration:', error);
        captureException(error as Error, {
          operation: 'token-consumption-regeneration',
          userId,
          tokensRequired: MEME_REGENERATION_TOKEN_COST
        });
      }
    }

    // Track successful regeneration
    trackEvent('regeneration_successful', {
      topic: topic.substring(0, 50),
      newTemplateId,
      resultCount: results.length,
      excludedTemplates: usedTemplateIds.length,
      tokensConsumed: userId && results.length > 0 ? MEME_REGENERATION_TOKEN_COST : 0
    });

    addBreadcrumb({
      message: 'Successfully regenerated memes',
      category: 'success',
      level: 'info',
      data: {
        resultCount: results.length,
        newTemplate: templateName,
        tokensConsumed: userId && results.length > 0 ? MEME_REGENERATION_TOKEN_COST : 0
      }
    });

    await flushEvents(1000);
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(200).json({ 
      results,
      newTemplateId,
      templateName
    });

  } catch (error) {
    console.error('Error in regenerate API:', error);
    
    captureException(error as Error, {
      operation: 'meme-regeneration-handler',
      request_body: req.body,
      user_agent: req.headers['user-agent']
    });

    trackEvent('regeneration_error', {
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

    return res.status(500).json({ error: 'Internal server error' });
  }
}