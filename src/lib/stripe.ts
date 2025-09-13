/**
 * Stripe configuration and utilities
 */

import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
  typescript: true,
});

// Client-side Stripe instance
let stripePromise: Promise<any>;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Token packages configuration
export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  bonus?: string;
  description: string;
  stripePriceId?: string; // Will be set up in Stripe Dashboard
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 20,
    price: 2.99,
    description: '20 meme generations',
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    tokens: 50,
    price: 4.99,
    originalPrice: 7.47,
    popular: true,
    description: '50 meme generations',
    stripePriceId: process.env.STRIPE_PRICE_ID_POPULAR
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    tokens: 100,
    price: 7.99,
    originalPrice: 14.95,
    description: '100 meme generations',
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO
  },
  {
    id: 'unlimited',
    name: 'Unlimited Pack',
    tokens: 500,
    price: 19.99,
    originalPrice: 74.75,
    description: '500 meme generations',
    stripePriceId: process.env.STRIPE_PRICE_ID_UNLIMITED
  }
];

/**
 * Get token package by ID
 */
export function getTokenPackageById(packageId: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find(pkg => pkg.id === packageId);
}

/**
 * Get token package by Stripe price ID
 */
export function getTokenPackageByPriceId(priceId: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find(pkg => pkg.stripePriceId === priceId);
}

/**
 * Format price for display
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents);
}

/**
 * Convert dollars to cents for Stripe
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}