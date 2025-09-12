import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from '../create-checkout-session';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  };
  
  return jest.fn(() => mockStripe);
});

const mockStripe = new Stripe('test_key', { apiVersion: '2024-06-20' });

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { 
    ...originalEnv, 
    STRIPE_SECRET_KEY: 'sk_test_mock_key' 
  };
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('/api/create-checkout-session', () => {
  const createRequestResponse = (body: any = {}, method = 'POST', headers: any = {}) => {
    return createMocks<NextApiRequest, NextApiResponse>({
      method,
      headers: {
        origin: 'http://localhost:3000',
        ...headers,
      },
      body,
    });
  };

  describe('Method validation', () => {
    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createRequestResponse({}, 'GET');

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
      expect(res._getHeaders()['allow']).toBe('POST');
    });
  });

  describe('Request validation', () => {
    it('should return 400 when priceId is missing', async () => {
      const { req, res } = createRequestResponse({});

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Missing required parameter: priceId',
      });
    });

    it('should return 400 when priceId is empty string', async () => {
      const { req, res } = createRequestResponse({ priceId: '' });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Missing required parameter: priceId',
      });
    });
  });

  describe('Successful checkout session creation', () => {
    it('should create checkout session with valid parameters', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });
    });

    it('should create checkout session with custom URLs', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      await handler(req, res);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        ui_mode: 'hosted',
        line_items: [
          {
            price: 'price_test_123',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        automatic_tax: { enabled: true },
        billing_address_collection: 'required',
        customer_creation: 'always',
        metadata: {
          source: 'mememe-app',
          plan: 'premium',
        },
        subscription_data: {
          metadata: {
            source: 'mememe-app',
            plan: 'premium',
          },
        },
      });

      expect(res._getStatusCode()).toBe(200);
    });

    it('should use default URLs when not provided', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'http://localhost:3000/pricing?success=true',
          cancel_url: 'http://localhost:3000/pricing?canceled=true',
        })
      );
    });

    it('should handle missing origin header', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createRequestResponse(
        { priceId: 'price_test_123' },
        'POST',
        {} // no origin header
      );

      await handler(req, res);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'http://localhost:3000/pricing?success=true',
          cancel_url: 'http://localhost:3000/pricing?canceled=true',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle missing session URL', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: null, // Missing URL
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'An unexpected error occurred while creating checkout session',
      });
    });

    it('should handle StripeCardError', async () => {
      const stripeError = new Error('Card was declined') as any;
      stripeError.type = 'StripeCardError';

      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(stripeError);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Card was declined',
      });
    });

    it('should handle StripeRateLimitError', async () => {
      const stripeError = new Error('Rate limit exceeded') as any;
      stripeError.type = 'StripeRateLimitError';

      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(stripeError);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(429);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Too many requests made to the API too quickly',
      });
    });

    it('should handle StripeInvalidRequestError', async () => {
      const stripeError = new Error('Invalid parameters') as any;
      stripeError.type = 'StripeInvalidRequestError';

      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(stripeError);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid parameters were supplied to Stripe\'s API',
      });
    });

    it('should handle StripeAPIError', async () => {
      const stripeError = new Error('API error') as any;
      stripeError.type = 'StripeAPIError';

      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(stripeError);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'An error occurred internally with Stripe\'s API',
      });
    });

    it('should handle StripeConnectionError', async () => {
      const stripeError = new Error('Connection error') as any;
      stripeError.type = 'StripeConnectionError';

      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(stripeError);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Some kind of error occurred during the HTTPS communication',
      });
    });

    it('should handle StripeAuthenticationError', async () => {
      const stripeError = new Error('Authentication failed') as any;
      stripeError.type = 'StripeAuthenticationError';

      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(stripeError);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'You probably used an incorrect API key',
      });
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Unknown error');

      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(genericError);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'An unexpected error occurred while creating checkout session',
      });
    });
  });

  describe('Console logging', () => {
    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Test error');

      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(testError);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Stripe checkout session creation failed:',
        testError
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Stripe configuration', () => {
    it('should call Stripe with correct configuration', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      // Verify Stripe constructor was called with correct parameters
      expect(Stripe).toHaveBeenCalledWith('sk_test_mock_key', {
        apiVersion: '2024-06-20',
      });
    });

    it('should include correct metadata in session creation', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createRequestResponse({
        priceId: 'price_test_123',
      });

      await handler(req, res);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            source: 'mememe-app',
            plan: 'premium',
          },
          subscription_data: {
            metadata: {
              source: 'mememe-app',
              plan: 'premium',
            },
          },
        })
      );
    });
  });
});