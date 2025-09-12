import { NextApiRequest, NextApiResponse } from 'next';
import { moderateText } from '../../lib/moderation';
import { generateCaptions } from '../../lib/generateCaptions';
import { renderMeme } from '../../lib/imgflip';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { rateLimitMiddleware } from '../../lib/rateLimit';
import { 
  captureException, 
  captureMessage,
  addBreadcrumb, 
  setExtra,
  startTransaction,
  trackEvent,
  flushEvents 
} from '../../lib/telemetry';

// Define types for the API
interface GenerateRequest {
  topic: string;
  templateId?: string;
}

interface GenerateResult {
  caption: string;
  imageUrl: string;
  templateId: string;
}

interface GenerateResponse {
  results: GenerateResult[];
}

interface ErrorResponse {
  error: string;
};

/**
 * API route for generating memes
 * POST /api/generate
 * Body: { topic: string, templateId?: string }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResponse | ErrorResponse>
) {
  // Start performance monitoring transaction
  const transaction = startTransaction('meme-generation', 'http.server');
  
  // Add initial breadcrumb
  addBreadcrumb({
    message: 'Meme generation request started',
    category: 'api',
    level: 'info',
    data: {
      method: req.method,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length']
    }
  });

  // Set extra context for debugging
  setExtra('request_method', req.method);
  setExtra('user_agent', req.headers['user-agent']);
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      addBreadcrumb({
        message: 'Request rejected - method not allowed',
        category: 'validation',
        level: 'warning',
        data: { method: req.method }
      });
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Apply rate limiting
    const rateLimitPassed = await rateLimitMiddleware(req, res);
    if (!rateLimitPassed) {
      addBreadcrumb({
        message: 'Request rejected - rate limit exceeded',
        category: 'rate-limit',
        level: 'warning'
      });
      trackEvent('rate_limit_exceeded', {
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      });
      return; // rateLimitMiddleware already sent the 429 response
    }

    const { topic, templateId } = req.body as GenerateRequest;

    // Set request context for debugging
    setExtra('request_topic', topic);
    setExtra('request_template_id', templateId);

    addBreadcrumb({
      message: 'Processing meme generation request',
      category: 'processing',
      level: 'info',
      data: { topic, templateId }
    });

    // 1. Validate input
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      addBreadcrumb({
        message: 'Request validation failed - topic missing or invalid',
        category: 'validation',
        level: 'warning',
        data: { topic: typeof topic }
      });
      trackEvent('validation_error', { error: 'topic_required' });
      return res.status(400).json({ error: 'Topic is required' });
    }

    addBreadcrumb({
      message: 'Input validation passed',
      category: 'validation',
      level: 'info'
    });

    // 2. Run moderation on input
    const moderationResult = await moderateText(topic);
    if (moderationResult.flagged) {
      addBreadcrumb({
        message: 'Content moderation rejected input',
        category: 'moderation',
        level: 'warning',
        data: { topic }
      });
      trackEvent('content_moderated', { 
        type: 'input',
        topic: topic.substring(0, 50) // Only log first 50 chars for privacy
      });
      return res.status(400).json({ error: 'input_moderated' });
    }

    addBreadcrumb({
      message: 'Input moderation passed',
      category: 'moderation',
      level: 'info'
    });

    // 3. Generate captions
    const captions = await generateCaptions(topic, templateId);

    addBreadcrumb({
      message: `Generated ${captions.length} captions`,
      category: 'generation',
      level: 'info',
      data: { captionCount: captions.length, topic, templateId }
    });

    // 4. Render memes for each caption
    const results: GenerateResult[] = [];
    let successfulGenerations = 0;
    let failedGenerations = 0;
    let moderatedCaptions = 0;

    for (const caption of captions) {
      addBreadcrumb({
        message: 'Processing caption for meme generation',
        category: 'meme-processing',
        level: 'info',
        data: { caption: caption.substring(0, 50) }
      });

      // Split caption into top and bottom text (if it contains a separator)
      const [captionTop, captionBottom] = caption.includes('|') 
        ? caption.split('|').map(part => part.trim())
        : [caption, ''];

      // Use provided templateId or default to a common one if not provided
      const templateIdToUse = templateId || '181913649'; // Drake Hotline Bling template as default

      // 5. Run moderation on the caption
      const captionModerationResult = await moderateText(caption);
      if (captionModerationResult.flagged) {
        moderatedCaptions++;
        addBreadcrumb({
          message: 'Caption rejected by moderation',
          category: 'moderation',
          level: 'warning',
          data: { caption: caption.substring(0, 30) }
        });
        continue; // Skip this caption if it's flagged
      }

      try {
        // Generate the meme image
        const imageUrl = await renderMeme(templateIdToUse, captionTop, captionBottom);

        // 6. Store the image URL (using Imgflip URL directly for MVP)
        // For production, you might want to use uploadToCloudinary(imageUrl)
        
        // Add to results
        results.push({
          caption,
          imageUrl,
          templateId: templateIdToUse
        });
        
        successfulGenerations++;
        addBreadcrumb({
          message: 'Meme generated successfully',
          category: 'meme-generation',
          level: 'info',
          data: { 
            caption: caption.substring(0, 30),
            templateId: templateIdToUse,
            imageUrl: imageUrl ? 'generated' : 'missing'
          }
        });
      } catch (error) {
        failedGenerations++;
        console.error(`Error generating meme for caption: ${caption}`, error);
        
        // Capture error with context
        captureException(error as Error, {
          caption: caption.substring(0, 50),
          templateId: templateIdToUse,
          captionTop,
          captionBottom,
          operation: 'meme-generation'
        });
        
        addBreadcrumb({
          message: 'Meme generation failed',
          category: 'meme-generation',
          level: 'error',
          data: {
            caption: caption.substring(0, 30),
            error: (error as Error).message,
            templateId: templateIdToUse
          }
        });
        
        // Continue with other captions if one fails
      }
    }

    // 7. Return the results
    const generationSummary = {
      totalCaptions: captions.length,
      successfulGenerations,
      failedGenerations,
      moderatedCaptions,
      finalResults: results.length
    };
    
    setExtra('generation_summary', generationSummary);
    
    addBreadcrumb({
      message: 'Meme generation process completed',
      category: 'completion',
      level: 'info',
      data: generationSummary
    });
    
    if (results.length === 0) {
      addBreadcrumb({
        message: 'No valid memes generated',
        category: 'failure',
        level: 'error',
        data: generationSummary
      });
      
      trackEvent('generation_failed', {
        topic: topic.substring(0, 50),
        templateId,
        reason: 'no_valid_memes',
        ...generationSummary
      });
      
      captureMessage('Failed to generate any valid memes', 'warning', {
        topic,
        templateId,
        ...generationSummary
      });
      
      // Ensure events are flushed before response
      await flushEvents(1000);
      transaction?.finish();
      
      return res.status(500).json({ error: 'Failed to generate any valid memes' });
    }

    // Track successful generation
    trackEvent('generation_successful', {
      topic: topic.substring(0, 50),
      templateId,
      ...generationSummary
    });
    
    addBreadcrumb({
      message: 'Successfully returning meme results',
      category: 'success',
      level: 'info',
      data: {
        resultCount: results.length,
        ...generationSummary
      }
    });
    
    // Ensure events are flushed before response
    await flushEvents(1000);
    transaction?.finish();

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error in generate API:', error);
    
    // Capture the error with full context
    captureException(error as Error, {
      operation: 'meme-generation-handler',
      request_body: req.body,
      request_method: req.method,
      user_agent: req.headers['user-agent']
    });
    
    addBreadcrumb({
      message: 'Unhandled error in generate API',
      category: 'error',
      level: 'fatal',
      data: {
        error: (error as Error).message,
        stack: (error as Error).stack?.substring(0, 500)
      }
    });
    
    trackEvent('generation_error', {
      error_type: 'unhandled_exception',
      error_message: (error as Error).message
    });
    
    // Ensure events are flushed before response
    await flushEvents(1000);
    transaction?.setStatus('internal_error');
    transaction?.finish();
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
