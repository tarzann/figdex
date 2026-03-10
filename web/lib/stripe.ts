/**
 * Stripe Client Setup and Utility Functions
 */

import Stripe from 'stripe';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_LIVE;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_LIVE environment variable');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Get Stripe publishable key (for frontend)
export const getStripePublishableKey = (): string => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE;
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
  }
  return key;
};

// Stripe Price IDs for plans (set these in Stripe Dashboard or via API)
export const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_ID_PRO || '',
  team: process.env.STRIPE_PRICE_ID_TEAM || '',
} as const;

export type PlanId = 'pro' | 'team';

/**
 * Get Stripe price ID for a plan
 */
export function getStripePriceId(planId: PlanId): string {
  const priceId = STRIPE_PRICE_IDS[planId];
  if (!priceId) {
    throw new Error(`Stripe price ID not configured for plan: ${planId}`);
  }
  return priceId;
}

/**
 * Verify webhook signature from Stripe
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    const error = err as Error;
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

/**
 * Get webhook secret from environment
 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET_LIVE;
  if (!secret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
  }
  return secret;
}

/**
 * Create or retrieve Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // First, try to find existing customer
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: email,
    name: name,
    metadata: {
      figdex_user_id: userId,
    },
  });

  return customer;
}

