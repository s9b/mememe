import * as Sentry from '@sentry/nextjs';
import { PostHog } from 'posthog-js';

// PostHog instance
let posthog: PostHog | null = null;

// Track initialization status
let isInitialized = false;

/**
 * Initialize telemetry services (Sentry and PostHog)
 * Should be called once on application startup
 */
export function initTelemetry(): void {
  if (isInitialized) {
    console.warn('Telemetry already initialized');
    return;
  }

  try {
    // Initialize Sentry if DSN is provided
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
    if (sentryDsn) {
      Sentry.init({
        dsn: sentryDsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        debug: process.env.NODE_ENV === 'development',
        beforeSend(event, hint) {
          // Don't send events in test environment
          if (process.env.NODE_ENV === 'test') {
            return null;
          }
          return event;
        },
        // Note: BrowserTracing is automatically included in @sentry/nextjs
        // No need to manually add integrations for basic setup
      });
      
      console.log('Sentry initialized successfully');
    } else {
      console.log('SENTRY_DSN not provided, skipping Sentry initialization');
    }

    // Initialize PostHog if key is provided (client-side only)
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthogKey && typeof window !== 'undefined') {
      // Dynamic import PostHog to avoid SSR issues
      import('posthog-js').then(({ default: posthogLib }) => {
        posthogLib.init(posthogKey, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
          loaded: (posthogInstance) => {
            posthog = posthogInstance;
            console.log('PostHog initialized successfully');
          },
          capture_pageview: true,
          capture_pageleave: true,
          // Respect user privacy
          respect_dnt: true,
          // Disable autocapture in development unless explicitly enabled
          autocapture: process.env.NODE_ENV !== 'development' || !!process.env.NEXT_PUBLIC_POSTHOG_DEBUG,
        });
      }).catch((error) => {
        console.error('Failed to initialize PostHog:', error);
      });
    } else if (!posthogKey) {
      console.log('NEXT_PUBLIC_POSTHOG_KEY not provided, skipping PostHog initialization');
    }

    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize telemetry:', error);
    // Don't let telemetry initialization break the app
  }
}

/**
 * Capture an exception with Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  try {
    if (context) {
      Sentry.withScope((scope) => {
        scope.setContext('additional_context', context);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (err) {
    console.error('Failed to capture exception:', err);
  }
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): void {
  try {
    if (context) {
      Sentry.withScope((scope) => {
        scope.setContext('additional_context', context);
        Sentry.captureMessage(message, level);
      });
    } else {
      Sentry.captureMessage(message, level);
    }
  } catch (err) {
    console.error('Failed to capture message:', err);
  }
}

/**
 * Add a breadcrumb to Sentry
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}): void {
  try {
    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'custom',
      level: breadcrumb.level || 'info',
      data: breadcrumb.data || {},
      timestamp: Date.now() / 1000,
    });
  } catch (err) {
    console.error('Failed to add breadcrumb:', err);
  }
}

/**
 * Set user context for Sentry
 */
export function setUserContext(user: { id?: string; email?: string; [key: string]: any }): void {
  try {
    Sentry.setUser(user);
  } catch (err) {
    console.error('Failed to set user context:', err);
  }
}

/**
 * Set tags for Sentry
 */
export function setTags(tags: Record<string, string>): void {
  try {
    Sentry.setTags(tags);
  } catch (err) {
    console.error('Failed to set tags:', err);
  }
}

/**
 * Track an event with PostHog
 */
export function trackEvent(event: string, properties?: Record<string, any>): void {
  try {
    if (posthog) {
      posthog.capture(event, properties);
    } else if (typeof window !== 'undefined') {
      // Queue event if PostHog not yet initialized
      setTimeout(() => trackEvent(event, properties), 1000);
    }
  } catch (err) {
    console.error('Failed to track event:', err);
  }
}

/**
 * Identify user for PostHog
 */
export function identifyUser(userId: string, traits?: Record<string, any>): void {
  try {
    if (posthog) {
      posthog.identify(userId, traits);
    }
  } catch (err) {
    console.error('Failed to identify user:', err);
  }
}

/**
 * Track page view with PostHog
 */
export function trackPageView(page?: string): void {
  try {
    if (posthog) {
      posthog.capture('$pageview', {
        $current_url: page || window.location.href,
      });
    }
  } catch (err) {
    console.error('Failed to track page view:', err);
  }
}

/**
 * Start a Sentry transaction/span for performance monitoring
 * Simplified to avoid API compatibility issues
 */
export function startTransaction(name: string, op?: string): any {
  try {
    // Use modern startSpan API if available
    if (typeof (Sentry as any).startSpan === 'function') {
      return (Sentry as any).startSpan({ name, op: op || 'custom' }, (span: any) => span);
    }
    // Otherwise return a no-op object with all expected methods
    return { 
      finish: () => {}, 
      setTag: () => {}, 
      setData: () => {},
      setStatus: () => {},
      setContext: () => {}
    };
  } catch (err) {
    console.error('Failed to start transaction:', err);
    // Return a no-op object to prevent crashes
    return { 
      finish: () => {}, 
      setTag: () => {}, 
      setData: () => {},
      setStatus: () => {},
      setContext: () => {}
    };
  }
}

/**
 * Get the current Sentry span/transaction
 * Simplified to avoid API compatibility issues
 */
export function getCurrentTransaction(): any {
  try {
    // Try modern API if available
    if (typeof (Sentry as any).getActiveSpan === 'function') {
      return (Sentry as any).getActiveSpan();
    }
    // Return undefined if not available
    return undefined;
  } catch (err) {
    console.error('Failed to get current transaction:', err);
    return undefined;
  }
}

/**
 * Add extra context to Sentry
 */
export function setExtra(key: string, value: any): void {
  try {
    Sentry.setExtra(key, value);
  } catch (err) {
    console.error('Failed to set extra context:', err);
  }
}

/**
 * Flush pending events (useful for serverless functions)
 */
export async function flushEvents(timeout: number = 2000): Promise<boolean> {
  try {
    return await Sentry.flush(timeout);
  } catch (err) {
    console.error('Failed to flush events:', err);
    return false;
  }
}

// Export Sentry for direct access if needed
export { Sentry };

// Export PostHog getter for direct access if needed
export const getPostHog = (): PostHog | null => posthog;

// Export initialization status
export const isTelemetryInitialized = (): boolean => isInitialized;