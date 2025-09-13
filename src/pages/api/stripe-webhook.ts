import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { stripe } from '../../lib/stripe';
import { updateUserTokens } from '../../lib/firebase-admin';
import { 
  captureException, 
  addBreadcrumb, 
  setExtra,
  startTransaction,
  trackEvent,
  flushEvents 
} from '../../lib/telemetry';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Stripe webhook handler for processing token purchase events
 * POST /api/stripe-webhook
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const transaction = startTransaction('stripe-webhook', 'http.server');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  
  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    captureException(new Error('STRIPE_WEBHOOK_SECRET is not set'));
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;
  let body: Buffer;

  try {
    body = await buffer(req);
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    
    addBreadcrumb({
      message: 'Webhook event received',
      category: 'webhook',
      level: 'info',
      data: {
        eventType: event.type,
        eventId: event.id
      }
    });

  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    captureException(err as Error, {
      operation: 'webhook-verification',
      signature: sig?.substring(0, 20) + '...'
    });
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        addBreadcrumb({
          message: 'Processing checkout session completed',
          category: 'webhook',
          level: 'info',
          data: {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            metadata: session.metadata
          }
        });

        // Only process paid sessions
        if (session.payment_status === 'paid' && session.metadata) {
          const { userId, packageId, tokens } = session.metadata;
          
          if (!userId || !tokens) {
            throw new Error('Missing required metadata in checkout session');
          }

          const tokenCount = parseInt(tokens, 10);
          if (isNaN(tokenCount) || tokenCount <= 0) {
            throw new Error('Invalid token count in metadata');
          }

          setExtra('user_id', userId);
          setExtra('package_id', packageId);
          setExtra('tokens_purchased', tokenCount);

          // Update user's token balance
          await updateUserTokens(userId, tokenCount);

          addBreadcrumb({
            message: 'User tokens updated successfully',
            category: 'database',
            level: 'info',
            data: {
              userId,
              tokensAdded: tokenCount,
              packageId
            }
          });

          trackEvent('token_purchase_completed', {
            userId,
            packageId,
            tokensAdded: tokenCount,
            sessionId: session.id,
            amountTotal: session.amount_total,
            currency: session.currency
          });

          console.log(`Successfully added ${tokenCount} tokens to user ${userId}`);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        trackEvent('checkout_session_expired', {
          sessionId: session.id,
          userId: session.metadata?.userId,
          packageId: session.metadata?.packageId
        });

        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        trackEvent('payment_failed', {
          paymentIntentId: paymentIntent.id,
          lastPaymentError: paymentIntent.last_payment_error?.message
        });

        console.log(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await flushEvents(1000);
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error processing webhook event:', error);
    
    captureException(error as Error, {
      operation: 'webhook-processing',
      event_type: event.type,
      event_id: event.id
    });

    trackEvent('webhook_processing_error', {
      eventType: event.type,
      eventId: event.id,
      errorMessage: (error as Error).message
    });

    await flushEvents(1000);
    if (transaction && typeof transaction.setStatus === 'function') {
      transaction.setStatus('internal_error');
    }
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }

    res.status(500).json({ error: 'Webhook processing failed' });
  }
}