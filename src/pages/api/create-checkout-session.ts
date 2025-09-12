import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    // Validate required parameters
    if (!priceId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: priceId' 
      });
    }

    // Set default URLs if not provided
    const baseUrl = req.headers.origin || 'http://localhost:3000';
    const defaultSuccessUrl = `${baseUrl}/pricing?success=true`;
    const defaultCancelUrl = `${baseUrl}/pricing?canceled=true`;

    // Create Checkout Sessions from body params
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'hosted',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      customer_creation: 'always',
      metadata: {
        source: 'mememe-app',
        plan: 'premium'
      },
      subscription_data: {
        metadata: {
          source: 'mememe-app',
          plan: 'premium'
        }
      }
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (err: any) {
    console.error('Stripe checkout session creation failed:', err);
    
    // Return appropriate error messages
    if (err.type === 'StripeCardError') {
      res.status(400).json({ error: err.message });
    } else if (err.type === 'StripeRateLimitError') {
      res.status(429).json({ error: 'Too many requests made to the API too quickly' });
    } else if (err.type === 'StripeInvalidRequestError') {
      res.status(400).json({ error: 'Invalid parameters were supplied to Stripe\'s API' });
    } else if (err.type === 'StripeAPIError') {
      res.status(500).json({ error: 'An error occurred internally with Stripe\'s API' });
    } else if (err.type === 'StripeConnectionError') {
      res.status(500).json({ error: 'Some kind of error occurred during the HTTPS communication' });
    } else if (err.type === 'StripeAuthenticationError') {
      res.status(401).json({ error: 'You probably used an incorrect API key' });
    } else {
      res.status(500).json({ 
        error: 'An unexpected error occurred while creating checkout session' 
      });
    }
  }
}