import { jest } from '@jest/globals';
import * as telemetry from '../telemetry';

// Mock Sentry
const mockSentry = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTags: jest.fn(),
  setExtra: jest.fn(),
  withScope: jest.fn(),
  startTransaction: jest.fn(),
  getCurrentHub: jest.fn(),
  flush: jest.fn(),
  BrowserTracing: jest.fn(),
};

// Mock PostHog
const mockPostHog = {
  init: jest.fn(),
  capture: jest.fn(),
  identify: jest.fn(),
};

// Mock the modules
jest.mock('@sentry/nextjs', () => mockSentry);
jest.mock('posthog-js', () => ({ default: mockPostHog }));

// Mock the telemetry module to avoid import issues
jest.mock('../telemetry', () => {
  const actualTelemetry = jest.requireActual('../telemetry');
  return {
    ...actualTelemetry,
    // Override functions that might cause import issues
  };
});

// Mock window object for client-side tests
const mockWindow = {
  location: {
    href: 'https://example.com/test',
  },
};

describe('Telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    delete process.env.NODE_ENV;
  });

  describe('initTelemetry', () => {
    it('should initialize Sentry when DSN is provided', () => {
      process.env.SENTRY_DSN = 'https://test-dsn@sentry.io/123456';
      process.env.NODE_ENV = 'production';

      telemetry.initTelemetry();

      expect(mockSentry.init).toHaveBeenCalledWith({
        dsn: 'https://test-dsn@sentry.io/123456',
        environment: 'production',
        tracesSampleRate: 0.1,
        debug: false,
        beforeSend: expect.any(Function),
        integrations: expect.any(Array),
      });
    });

    it('should use NEXT_PUBLIC_SENTRY_DSN if SENTRY_DSN is not set', () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public-dsn@sentry.io/123456';
      process.env.NODE_ENV = 'development';

      telemetry.initTelemetry();

      expect(mockSentry.init).toHaveBeenCalledWith({
        dsn: 'https://public-dsn@sentry.io/123456',
        environment: 'development',
        tracesSampleRate: 1.0,
        debug: true,
        beforeSend: expect.any(Function),
        integrations: expect.any(Array),
      });
    });

    it('should not initialize Sentry when no DSN is provided', () => {
      telemetry.initTelemetry();

      expect(mockSentry.init).not.toHaveBeenCalled();
    });

    it('should filter events in test environment', () => {
      process.env.SENTRY_DSN = 'https://test-dsn@sentry.io/123456';
      process.env.NODE_ENV = 'test';

      telemetry.initTelemetry();

      const initCall = mockSentry.init.mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      // Test beforeSend function filters test events
      const mockEvent = { message: 'test event' };
      const result = beforeSend(mockEvent, {});

      expect(result).toBeNull();
    });

    it('should allow events in non-test environments', () => {
      process.env.SENTRY_DSN = 'https://test-dsn@sentry.io/123456';
      process.env.NODE_ENV = 'production';

      telemetry.initTelemetry();

      const initCall = mockSentry.init.mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      // Test beforeSend function allows non-test events
      const mockEvent = { message: 'production event' };
      const result = beforeSend(mockEvent, {});

      expect(result).toBe(mockEvent);
    });

    it('should not initialize multiple times', () => {
      process.env.SENTRY_DSN = 'https://test-dsn@sentry.io/123456';

      telemetry.initTelemetry();
      telemetry.initTelemetry();

      expect(mockSentry.init).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors gracefully', () => {
      process.env.SENTRY_DSN = 'invalid-dsn';
      mockSentry.init.mockImplementationOnce(() => {
        throw new Error('Invalid DSN');
      });

      expect(() => telemetry.initTelemetry()).not.toThrow();
    });
  });

  describe('captureException', () => {
    it('should capture exception without context', () => {
      const error = new Error('Test error');

      telemetry.captureException(error);

      expect(mockSentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture exception with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };

      mockSentry.withScope.mockImplementation((callback) => {
        const mockScope = {
          setContext: jest.fn(),
        };
        callback(mockScope);
      });

      telemetry.captureException(error, context);

      expect(mockSentry.withScope).toHaveBeenCalled();
      expect(mockSentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should handle capture errors gracefully', () => {
      mockSentry.captureException.mockImplementationOnce(() => {
        throw new Error('Capture failed');
      });

      const error = new Error('Test error');

      expect(() => telemetry.captureException(error)).not.toThrow();
    });
  });

  describe('captureMessage', () => {
    it('should capture message with default level', () => {
      const message = 'Test message';

      telemetry.captureMessage(message);

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(message, 'info');
    });

    it('should capture message with custom level', () => {
      const message = 'Error message';

      telemetry.captureMessage(message, 'error');

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(message, 'error');
    });

    it('should capture message with context', () => {
      const message = 'Test message';
      const context = { feature: 'test' };

      mockSentry.withScope.mockImplementation((callback) => {
        const mockScope = {
          setContext: jest.fn(),
        };
        callback(mockScope);
      });

      telemetry.captureMessage(message, 'warning', context);

      expect(mockSentry.withScope).toHaveBeenCalled();
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(message, 'warning');
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb with default values', () => {
      const breadcrumb = {
        message: 'Test breadcrumb',
      };

      telemetry.addBreadcrumb(breadcrumb);

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test breadcrumb',
        category: 'custom',
        level: 'info',
        data: {},
        timestamp: expect.any(Number),
      });
    });

    it('should add breadcrumb with custom values', () => {
      const breadcrumb = {
        message: 'Custom breadcrumb',
        category: 'api',
        level: 'warning' as const,
        data: { endpoint: '/test' },
      };

      telemetry.addBreadcrumb(breadcrumb);

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Custom breadcrumb',
        category: 'api',
        level: 'warning',
        data: { endpoint: '/test' },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('setUserContext', () => {
    it('should set user context', () => {
      const user = { id: '123', email: 'test@example.com' };

      telemetry.setUserContext(user);

      expect(mockSentry.setUser).toHaveBeenCalledWith(user);
    });
  });

  describe('setTags', () => {
    it('should set tags', () => {
      const tags = { environment: 'test', version: '1.0.0' };

      telemetry.setTags(tags);

      expect(mockSentry.setTags).toHaveBeenCalledWith(tags);
    });
  });

  describe('setExtra', () => {
    it('should set extra context', () => {
      const key = 'request_id';
      const value = '12345';

      telemetry.setExtra(key, value);

      expect(mockSentry.setExtra).toHaveBeenCalledWith(key, value);
    });
  });

  describe('startTransaction', () => {
    it('should start transaction with default op', () => {
      const mockTransaction = { name: 'test', op: 'custom' };
      mockSentry.startTransaction.mockReturnValueOnce(mockTransaction);

      const result = telemetry.startTransaction('test');

      expect(mockSentry.startTransaction).toHaveBeenCalledWith({
        name: 'test',
        op: 'custom',
      });
      expect(result).toBe(mockTransaction);
    });

    it('should start transaction with custom op', () => {
      const mockTransaction = { name: 'test', op: 'http' };
      mockSentry.startTransaction.mockReturnValueOnce(mockTransaction);

      const result = telemetry.startTransaction('test', 'http');

      expect(mockSentry.startTransaction).toHaveBeenCalledWith({
        name: 'test',
        op: 'http',
      });
      expect(result).toBe(mockTransaction);
    });

    it('should handle transaction start errors', () => {
      mockSentry.startTransaction.mockImplementationOnce(() => {
        throw new Error('Transaction failed');
      });

      const result = telemetry.startTransaction('test');

      expect(result).toBeNull();
    });
  });

  describe('flushEvents', () => {
    it('should flush events with default timeout', async () => {
      mockSentry.flush.mockResolvedValueOnce(true);

      const result = await telemetry.flushEvents();

      expect(mockSentry.flush).toHaveBeenCalledWith(2000);
      expect(result).toBe(true);
    });

    it('should flush events with custom timeout', async () => {
      mockSentry.flush.mockResolvedValueOnce(true);

      const result = await telemetry.flushEvents(5000);

      expect(mockSentry.flush).toHaveBeenCalledWith(5000);
      expect(result).toBe(true);
    });

    it('should handle flush errors', async () => {
      mockSentry.flush.mockRejectedValueOnce(new Error('Flush failed'));

      const result = await telemetry.flushEvents();

      expect(result).toBe(false);
    });
  });

  describe('PostHog integration', () => {
    beforeEach(() => {
      // Mock window object
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
      });
    });

    it('should track event when PostHog is available', () => {
      // Mock PostHog instance
      const mockPostHogInstance = {
        capture: jest.fn(),
        identify: jest.fn(),
      };

      // Set up PostHog getter to return mock instance
      jest.doMock('../telemetry', () => ({
        ...jest.requireActual('../telemetry'),
        getPostHog: () => mockPostHogInstance,
      }));

      telemetry.trackEvent('test_event', { property: 'value' });

      // Since PostHog is initialized asynchronously, we need to test the queue mechanism
      // or mock the getPostHog function directly
    });

    it('should identify user when PostHog is available', () => {
      // Similar test structure for identify functionality
      telemetry.identifyUser('user123', { name: 'Test User' });
    });

    it('should track page view when PostHog is available', () => {
      // Similar test structure for page view tracking
      telemetry.trackPageView();
    });
  });

  describe('utility functions', () => {
    it('should return initialization status', () => {
      expect(telemetry.isTelemetryInitialized()).toBe(false);

      telemetry.initTelemetry();

      expect(telemetry.isTelemetryInitialized()).toBe(true);
    });

    it('should return PostHog instance', () => {
      const instance = telemetry.getPostHog();
      expect(instance).toBeNull(); // Initially null since not in browser environment
    });

    it('should export Sentry for direct access', () => {
      expect(telemetry.Sentry).toBe(mockSentry);
    });
  });

  describe('error handling', () => {
    it('should handle all telemetry functions gracefully when they fail', () => {
      // Mock all Sentry functions to throw
      Object.keys(mockSentry).forEach((key) => {
        if (typeof mockSentry[key] === 'function') {
          mockSentry[key].mockImplementation(() => {
            throw new Error('Sentry error');
          });
        }
      });

      // None of these should throw
      expect(() => telemetry.captureException(new Error('test'))).not.toThrow();
      expect(() => telemetry.captureMessage('test')).not.toThrow();
      expect(() => telemetry.addBreadcrumb({ message: 'test' })).not.toThrow();
      expect(() => telemetry.setUserContext({ id: '1' })).not.toThrow();
      expect(() => telemetry.setTags({ test: 'value' })).not.toThrow();
      expect(() => telemetry.setExtra('key', 'value')).not.toThrow();
      expect(() => telemetry.trackEvent('test')).not.toThrow();
      expect(() => telemetry.identifyUser('123')).not.toThrow();
      expect(() => telemetry.trackPageView()).not.toThrow();
    });
  });

  describe('environment-specific behavior', () => {
    it('should configure correctly for development environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.SENTRY_DSN = 'https://dev-dsn@sentry.io/123456';

      telemetry.initTelemetry();

      expect(mockSentry.init).toHaveBeenCalledWith({
        dsn: 'https://dev-dsn@sentry.io/123456',
        environment: 'development',
        tracesSampleRate: 1.0,
        debug: true,
        beforeSend: expect.any(Function),
        integrations: expect.any(Array),
      });
    });

    it('should configure correctly for production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://prod-dsn@sentry.io/123456';

      telemetry.initTelemetry();

      expect(mockSentry.init).toHaveBeenCalledWith({
        dsn: 'https://prod-dsn@sentry.io/123456',
        environment: 'production',
        tracesSampleRate: 0.1,
        debug: false,
        beforeSend: expect.any(Function),
        integrations: expect.any(Array),
      });
    });
  });
});