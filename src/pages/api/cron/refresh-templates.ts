import { NextApiRequest, NextApiResponse } from 'next';
import { refreshViralTemplateCache } from '../../../lib/viralTemplates';
import { getCacheStats } from '../../../lib/templateCache';
import {
  captureException,
  addBreadcrumb,
  setExtra,
  startTransaction,
  trackEvent,
  flushEvents
} from '../../../lib/telemetry';

interface CronRefreshResponse {
  success: boolean;
  message: string;
  data?: {
    templates: number;
    duration: number;
    sources: {
      reddit: number;
      imgflip: number;
      both: number;
    };
    previousCache?: {
      cached: boolean;
      age: number;
      templates: number;
      lastUpdated: string | null;
    };
  };
  error?: string;
  timestamp: string;
}

/**
 * Vercel Cron API endpoint for refreshing viral template cache
 * This endpoint is called automatically by Vercel Cron jobs
 * 
 * GET /api/cron/refresh-templates
 * 
 * Expected to be called by Vercel Cron with proper authorization header
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronRefreshResponse>
) {
  const transaction = startTransaction('cron-refresh-templates', 'cron.job');
  
  addBreadcrumb({
    message: 'Cron template refresh started',
    category: 'cron',
    level: 'info',
    data: {
      method: req.method,
      userAgent: req.headers['user-agent'],
      authorization: !!req.headers.authorization
    }
  });

  const timestamp = new Date().toISOString();

  try {
    // Only allow GET requests from Vercel Cron
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
        error: 'Only GET requests are supported',
        timestamp
      });
    }

    // Verify Vercel Cron authorization
    // Vercel Cron sends a special header that we can check
    const authHeader = req.headers.authorization;
    const expectedAuth = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, verify it matches
    if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
      addBreadcrumb({
        message: 'Unauthorized cron request',
        category: 'auth',
        level: 'warning',
        data: { hasAuth: !!authHeader, hasSecret: !!expectedAuth }
      });
      
      trackEvent('cron_unauthorized', {
        endpoint: 'refresh-templates',
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'Invalid or missing authorization',
        timestamp
      });
    }

    // Also allow requests from Vercel's specific user agent or localhost for testing
    const userAgent = req.headers['user-agent'] || '';
    const isVercelCron = userAgent.includes('vercel') || userAgent.includes('cron');
    const isLocalhost = req.headers.host?.includes('localhost');
    
    if (!expectedAuth && !isVercelCron && !isLocalhost) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        error: 'This endpoint is only accessible via Vercel Cron or localhost',
        timestamp
      });
    }

    setExtra('cron_source', isVercelCron ? 'vercel' : isLocalhost ? 'localhost' : 'other');

    addBreadcrumb({
      message: 'Starting viral template cache refresh',
      category: 'cache',
      level: 'info'
    });

    // Get current cache stats before refresh
    const previousCacheStats = await getCacheStats();
    
    setExtra('previous_cache_age', previousCacheStats.age);
    setExtra('previous_cache_templates', previousCacheStats.templates);

    // Refresh the viral template cache
    const refreshResult = await refreshViralTemplateCache();

    if (refreshResult.success) {
      addBreadcrumb({
        message: 'Template cache refresh completed successfully',
        category: 'cache',
        level: 'info',
        data: {
          templates: refreshResult.templates,
          duration: refreshResult.duration,
          sources: refreshResult.sources
        }
      });

      trackEvent('cron_template_refresh_success', {
        templates: refreshResult.templates,
        duration: refreshResult.duration,
        reddit_templates: refreshResult.sources.reddit,
        imgflip_templates: refreshResult.sources.imgflip,
        both_templates: refreshResult.sources.both,
        previous_templates: previousCacheStats.templates,
        cache_age_before: previousCacheStats.age
      });

      await flushEvents(1000);
      if (transaction && typeof transaction.finish === 'function') {
        transaction.finish();
      }

      return res.status(200).json({
        success: true,
        message: `Successfully refreshed viral template cache with ${refreshResult.templates} templates`,
        data: {
          templates: refreshResult.templates,
          duration: refreshResult.duration,
          sources: refreshResult.sources,
          previousCache: previousCacheStats
        },
        timestamp
      });
    } else {
      throw new Error(refreshResult.error || 'Unknown refresh error');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Cron template refresh failed:', errorMessage);
    
    captureException(error as Error, {
      operation: 'cron-template-refresh',
      user_agent: req.headers['user-agent'],
      host: req.headers.host
    });

    trackEvent('cron_template_refresh_error', {
      error_type: 'refresh_failed',
      error_message: errorMessage
    });

    await flushEvents(1000);
    if (transaction && typeof transaction.setStatus === 'function') {
      transaction.setStatus('internal_error');
    }
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(500).json({
      success: false,
      message: 'Template cache refresh failed',
      error: errorMessage,
      timestamp
    });
  }
}