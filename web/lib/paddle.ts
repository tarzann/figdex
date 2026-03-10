/**
 * Paddle Client Setup and Utility Functions
 * 
 * Note: Paddle works differently than Stripe:
 * - Uses hosted checkout (opens in overlay/modal)
 * - Frontend uses @paddle/paddle-js SDK
 * - Backend mainly for webhooks and API calls
 */

/**
 * Get Paddle vendor ID from environment
 */
export function getPaddleVendorId(): string {
  const vendorId = process.env.PADDLE_VENDOR_ID;
  if (!vendorId) {
    throw new Error('Missing PADDLE_VENDOR_ID environment variable');
  }
  return vendorId;
}

/**
 * Get Paddle API key (for server-side API calls)
 */
export function getPaddleApiKey(): string {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing PADDLE_API_KEY environment variable');
  }
  return apiKey;
}

/**
 * Get Paddle public key (for frontend - used by @paddle/paddle-js)
 */
export function getPaddlePublicKey(): string {
  const publicKey = process.env.NEXT_PUBLIC_PADDLE_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('Missing NEXT_PUBLIC_PADDLE_PUBLIC_KEY environment variable');
  }
  return publicKey;
}

/**
 * Get Paddle environment (sandbox or production)
 */
export function getPaddleEnvironment(): 'sandbox' | 'production' {
  return (process.env.PADDLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
}

/**
 * Get Paddle webhook secret for signature verification
 */
export function getPaddleWebhookSecret(): string {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Missing PADDLE_WEBHOOK_SECRET environment variable');
  }
  return secret;
}

/**
 * Paddle Product/Price IDs for plans
 * These should be created in Paddle Dashboard → Products
 */
export const PADDLE_PRICE_IDS = {
  pro: process.env.PADDLE_PRICE_ID_PRO || '',
  team: process.env.PADDLE_PRICE_ID_TEAM || '',
} as const;

export type PlanId = 'pro' | 'team';

/**
 * Get Paddle price ID for a plan
 */
export function getPaddlePriceId(planId: PlanId): string {
  const priceId = PADDLE_PRICE_IDS[planId];
  if (!priceId) {
    throw new Error(`Paddle price ID not configured for plan: ${planId}`);
  }
  return priceId;
}

/**
 * Paddle API base URL
 */
export function getPaddleApiUrl(): string {
  const env = getPaddleEnvironment();
  return env === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';
}

/**
 * Verify Paddle webhook signature
 * Paddle uses HMAC SHA256 with the webhook secret
 */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const computedSignature = hmac.digest('hex');
  
  return computedSignature === signature;
}

/**
 * Make authenticated API request to Paddle
 */
export async function paddleApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const apiKey = getPaddleApiKey();
  const baseUrl = getPaddleApiUrl();
  const url = `${baseUrl}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Paddle API error: ${error.message || response.statusText}`);
  }

  return response.json();
}
