import { NextApiRequest, NextApiResponse } from 'next';
import { refreshViralTemplateCache } from '../../../lib/viralTemplates';
import { getCacheStats, clearCache } from '../../../lib/templateCache';
import {
  captureException,
  addBreadcrumb,
  setExtra,
  startTransaction,
  trackEvent,
  flushEvents
} from '../../../lib/telemetry';

interface AdminRefreshResponse {
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
    cacheCleared?: boolean;
  };
  error?: string;
  timestamp: string;
}

/**
 * Admin API endpoint for manually refreshing viral template cache
 * 
 * POST /api/admin/refresh-templates
 * Query params:
 *   - clear: 'true' to clear cache before refresh
 *   - force: 'true' to force refresh even if cache is fresh
 * 
 * Requires admin authentication
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminRefreshResponse>
) {
  const transaction = startTransaction('admin-refresh-templates', 'http.server');
  
  addBreadcrumb({
    message: 'Admin template refresh started',
    category: 'admin',
    level: 'info',
    data: {
      method: req.method,
      query: req.query,
      userAgent: req.headers['user-agent']
    }
  });

  const timestamp = new Date().toISOString();

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
        error: 'Only POST requests are supported',
        timestamp
      });
    }

    // Admin authentication
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    
    if (!adminSecret) {
      return res.status(503).json({
        success: false,
        message: 'Service unavailable',
        error: 'Admin functionality not configured',
        timestamp
      });
    }

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      addBreadcrumb({
        message: 'Unauthorized admin request',
        category: 'auth',
        level: 'warning',
        data: { hasAuth: !!authHeader }
      });
      
      trackEvent('admin_unauthorized', {
        endpoint: 'refresh-templates',
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      });
      
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'Invalid or missing admin authorization',
        timestamp
      });
    }

    // Parse query parameters
    const clearCacheFirst = req.query.clear === 'true';
    const forceRefresh = req.query.force === 'true';
    
    setExtra('clear_cache_first', clearCacheFirst);
    setExtra('force_refresh', forceRefresh);

    addBreadcrumb({
      message: 'Admin authenticated, starting template refresh',
      category: 'admin',
      level: 'info',
      data: { clearCacheFirst, forceRefresh }
    });

    // Get current cache stats before any operations
    const previousCacheStats = await getCacheStats();
    
    setExtra('previous_cache_age', previousCacheStats.age);
    setExtra('previous_cache_templates', previousCacheStats.templates);

    // Clear cache if requested
    let cacheCleared = false;
    if (clearCacheFirst) {
      addBreadcrumb({
        message: 'Clearing template cache as requested',
        category: 'cache',
        level: 'info'
      });
      
      await clearCache();
      cacheCleared = true;
    }

    // Skip refresh if cache is fresh and not forced
    if (!forceRefresh && !cacheCleared && previousCacheStats.cached) {
      const cacheAgeHours = previousCacheStats.age / (1000 * 60 * 60);
      if (cacheAgeHours < 2) { // Less than 2 hours old
        return res.status(200).json({
          success: true,
          message: `Template cache is still fresh (${cacheAgeHours.toFixed(1)} hours old). Use ?force=true to refresh anyway.`,
          data: {
            templates: previousCacheStats.templates,
            duration: 0,
            sources: previousCacheStats.sources || { reddit: 0, imgflip: 0, both: 0 },
            previousCache: previousCacheStats,
            cacheCleared
          },
          timestamp
        });
      }
    }

    addBreadcrumb({
      message: 'Starting viral template cache refresh',
      category: 'cache',
      level: 'info'
    });

    // Refresh the viral template cache
    const refreshResult = await refreshViralTemplateCache();

    if (refreshResult.success) {
      addBreadcrumb({
        message: 'Admin template cache refresh completed successfully',
        category: 'cache',
        level: 'info',
        data: {
          templates: refreshResult.templates,
          duration: refreshResult.duration,
          sources: refreshResult.sources
        }
      });

      trackEvent('admin_template_refresh_success', {
        templates: refreshResult.templates,
        duration: refreshResult.duration,
        reddit_templates: refreshResult.sources.reddit,
        imgflip_templates: refreshResult.sources.imgflip,
        both_templates: refreshResult.sources.both,
        previous_templates: previousCacheStats.templates,
        cache_age_before: previousCacheStats.age,
        cache_cleared: cacheCleared,
        force_refresh: forceRefresh,
        admin_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
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
          previousCache: previousCacheStats,
          cacheCleared
        },
        timestamp
      });
    } else {
      throw new Error(refreshResult.error || 'Unknown refresh error');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Admin template refresh failed:', errorMessage);
    
    captureException(error as Error, {
      operation: 'admin-template-refresh',
      user_agent: req.headers['user-agent'],
      host: req.headers.host,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    trackEvent('admin_template_refresh_error', {
      error_type: 'refresh_failed',
      error_message: errorMessage,
      admin_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
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