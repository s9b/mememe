import { NextApiRequest, NextApiResponse } from 'next';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    redis: 'connected' | 'disconnected' | 'not_configured';
    sentry: 'configured' | 'not_configured';
    posthog: 'configured' | 'not_configured';
  };
}

/**
 * Health check endpoint
 * GET /api/health
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      services: {
        redis: 'not_configured',
        sentry: 'not_configured',
        posthog: 'not_configured',
      },
    });
  }

  try {
    // Check Redis connection
    let redisStatus: 'connected' | 'disconnected' | 'not_configured' = 'not_configured';
    if (process.env.REDIS_URL) {
      try {
        // Simple Redis connection test
        const { createClient } = await import('redis');
        const client = createClient({ url: process.env.REDIS_URL });
        await client.connect();
        await client.ping();
        await client.quit();
        redisStatus = 'connected';
      } catch (error) {
        redisStatus = 'disconnected';
      }
    }

    // Check Sentry configuration
    const sentryStatus = (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) 
      ? 'configured' 
      : 'not_configured';

    // Check PostHog configuration
    const posthogStatus = process.env.NEXT_PUBLIC_POSTHOG_KEY 
      ? 'configured' 
      : 'not_configured';

    const healthResponse: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      services: {
        redis: redisStatus,
        sentry: sentryStatus,
        posthog: posthogStatus,
      },
    };

    res.status(200).json(healthResponse);
  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      services: {
        redis: 'not_configured',
        sentry: 'not_configured',
        posthog: 'not_configured',
      },
    });
  }
}