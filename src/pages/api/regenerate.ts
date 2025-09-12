import { NextApiRequest, NextApiResponse } from 'next';
import { moderateWithGemini } from '../../lib/gemini';
import { renderMeme } from '../../lib/imgflip';
import { getCombinedTrendingTemplates, selectSmartTemplate } from '../../lib/templates';
import { rateLimitMiddleware } from '../../lib/rateLimit';
import { 
  captureException, 
  addBreadcrumb, 
  setExtra,
  startTransaction,
  trackEvent,
  flushEvents 
} from '../../lib/telemetry';

interface RegenerateRequest {
  topic: string;
  captions: string[];
  usedTemplateIds?: string[];
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

    const { topic, captions, usedTemplateIds = [] } = req.body as RegenerateRequest;

    // Set request context
    setExtra('request_topic', topic);
    setExtra('used_templates', usedTemplateIds);

    // Validate input
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    if (!captions || !Array.isArray(captions) || captions.length === 0) {
      return res.status(400).json({ error: 'Captions are required' });
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

    // Track successful regeneration
    trackEvent('regeneration_successful', {
      topic: topic.substring(0, 50),
      newTemplateId,
      resultCount: results.length,
      excludedTemplates: usedTemplateIds.length
    });

    addBreadcrumb({
      message: 'Successfully regenerated memes',
      category: 'success',
      level: 'info',
      data: {
        resultCount: results.length,
        newTemplate: templateName
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