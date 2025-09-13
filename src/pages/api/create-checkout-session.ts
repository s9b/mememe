import { NextApiRequest, NextApiResponse } from 'next';
import { stripe, getTokenPackageById, TOKEN_PACKAGES } from '../../lib/stripe';
import { rateLimitMiddleware } from '../../lib/rateLimit';
import { 
  captureException, 
  addBreadcrumb, 
  setExtra,
  startTransaction,
  trackEvent,
  flushEvents 
} from '../../lib/telemetry';

interface CheckoutRequest {
  packageId: string;
  userId: string;
}

interface CheckoutResponse {
  sessionId: string;
  url: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * Create Stripe checkout session for token purchases
 * POST /api/create-checkout-session
 * Body: { packageId: string, userId: string }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckoutResponse | ErrorResponse>
) {
  const transaction = startTransaction('create-checkout-session', 'http.server');
  
  addBreadcrumb({
    message: 'Checkout session creation started',
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

    const { packageId, userId } = req.body as CheckoutRequest;

    // Set request context
    setExtra('package_id', packageId);
    setExtra('user_id', userId);

    // Validate input
    if (!packageId || typeof packageId !== 'string') {
      return res.status(400).json({ 
        error: 'Package ID is required',
        code: 'INVALID_PACKAGE_ID'
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ 
        error: 'User ID is required',
        code: 'INVALID_USER_ID'
      });
    }

    // Get the token package
    const tokenPackage = getTokenPackageById(packageId);
    if (!tokenPackage) {
      addBreadcrumb({
        message: 'Invalid package ID provided',
        category: 'validation',
        level: 'error',
        data: { packageId, availablePackages: TOKEN_PACKAGES.map(p => p.id) }
      });
      
      return res.status(400).json({ 
        error: 'Invalid package ID',
        code: 'PACKAGE_NOT_FOUND'
      });
    }

    addBreadcrumb({
      message: 'Creating Stripe checkout session',
      category: 'stripe',
      level: 'info',
      data: { 
        packageId: tokenPackage.id,
        tokens: tokenPackage.tokens,
        price: tokenPackage.price,
        userId
      }
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tokenPackage.name} - ${tokenPackage.tokens} Tokens`,
              description: tokenPackage.description,
              metadata: {
                packageId: packageId,
                tokens: tokenPackage.tokens.toString()
              }
            },
            unit_amount: Math.round(tokenPackage.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/?cancelled=true`,
      metadata: {
        userId: userId,
        packageId: packageId,
        tokens: tokenPackage.tokens.toString(),
        price: tokenPackage.price.toString()
      },
      customer_email: undefined, // Will be filled by Stripe if user provides email
      billing_address_collection: 'auto'
    });

    addBreadcrumb({
      message: 'Stripe checkout session created successfully',
      category: 'stripe',
      level: 'info',
      data: { 
        sessionId: session.id,
        url: session.url,
        packageId: tokenPackage.id,
        userId
      }
    });

    // Track checkout session creation
    trackEvent('checkout_session_created', {
      sessionId: session.id,
      userId,
      packageId,
      tokens: tokenPackage.tokens,
      price: tokenPackage.price
    });

    await flushEvents(1000);
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url!
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    captureException(error as Error, {
      operation: 'create-checkout-session',
      request_body: req.body,
      user_agent: req.headers['user-agent']
    });

    addBreadcrumb({
      message: 'Checkout session creation failed',
      category: 'error',
      level: 'fatal',
      data: {
        error: (error as Error).message,
        stack: (error as Error).stack?.substring(0, 500)
      }
    });

    trackEvent('checkout_session_error', {
      error_type: 'stripe_error',
      error_message: (error as Error).message
    });

    await flushEvents(1000);
    if (transaction && typeof transaction.setStatus === 'function') {
      transaction.setStatus('internal_error');
    }
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      code: 'STRIPE_ERROR'
    });
  }
}
