import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyPaddleWebhookSignature, getPaddleWebhookSecret, paddleApiRequest } from '../../../lib/paddle';
import { getRawBody } from '../../../lib/webhook-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Paddle Webhook Handler
 * Handles all Paddle webhook events for payment processing
 * 
 * Paddle webhook events: https://developer.paddle.com/webhooks/overview
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get signature from headers
  const signature = req.headers['paddle-signature'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'Missing paddle-signature header' });
  }

  try {
    // Get raw body for webhook signature verification
    const rawBody = typeof req.body === 'string' ? req.body : 
                     Buffer.isBuffer(req.body) ? req.body.toString() :
                     await getRawBody(req).then(b => typeof b === 'string' ? b : b.toString());
    
    // Verify webhook signature
    const webhookSecret = getPaddleWebhookSecret();
    const isValid = verifyPaddleWebhookSignature(rawBody, signature, webhookSecret);
    
    if (!isValid) {
      console.error('Paddle webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);
    const eventType = event.event_type;

    console.log(`🔄 [PADDLE WEBHOOK] ${eventType}:`, event.data?.id || event.id);

    // Handle the event
    try {
      switch (eventType) {
        case 'subscription.created':
          await handleSubscriptionCreated(event.data);
          break;

        case 'subscription.updated':
          await handleSubscriptionUpdated(event.data);
          break;

        case 'subscription.canceled':
          await handleSubscriptionCanceled(event.data);
          break;

        case 'transaction.completed':
          await handleTransactionCompleted(event.data);
          break;

        case 'transaction.payment_failed':
          await handleTransactionPaymentFailed(event.data);
          break;

        default:
          console.log(`Unhandled Paddle event type: ${eventType}`);
      }

      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Error handling Paddle webhook event:', error);
      return res.status(500).json({ error: `Webhook handler error: ${error.message}` });
    }
  } catch (error: any) {
    console.error('Paddle webhook error:', error);
    return res.status(500).json({ error: `Webhook error: ${error.message}` });
  }
}

/**
 * Handle subscription.created
 * New subscription created in Paddle
 */
async function handleSubscriptionCreated(subscription: any) {
  console.log('🔄 [PADDLE WEBHOOK] subscription.created:', subscription.id);

  const userId = subscription.custom_data?.user_id;
  if (!userId) {
    console.error('Missing user_id in subscription custom_data');
    return;
  }

  await createOrUpdateSubscription(subscription, userId);
  
  const planId = determinePlanIdFromPriceId(subscription.items[0]?.price_id);
  if (planId) {
    await updateUserPlan(userId, planId, subscription.status);
  }
}

/**
 * Handle subscription.updated
 * Subscription updated (plan change, status change, etc.)
 */
async function handleSubscriptionUpdated(subscription: any) {
  console.log('🔄 [PADDLE WEBHOOK] subscription.updated:', subscription.id);

  const userId = subscription.custom_data?.user_id;
  if (!userId) {
    console.error('Missing user_id in subscription custom_data');
    return;
  }

  await createOrUpdateSubscription(subscription, userId);
  
  const planId = determinePlanIdFromPriceId(subscription.items[0]?.price_id);
  if (planId) {
    await updateUserPlan(userId, planId, subscription.status);
  }
}

/**
 * Handle subscription.canceled
 * Subscription cancelled
 */
async function handleSubscriptionCanceled(subscription: any) {
  console.log('🔄 [PADDLE WEBHOOK] subscription.canceled:', subscription.id);

  const userId = subscription.custom_data?.user_id;
  if (!userId) {
    console.error('Missing user_id in subscription custom_data');
    return;
  }

  // Update subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('subscription_id', subscription.id)
    .eq('provider', 'paddle');

  // Downgrade user to Free plan
  await updateUserPlan(userId, 'free', 'canceled');

  console.log(`✅ [PADDLE WEBHOOK] Subscription cancelled for user ${userId}`);
}

/**
 * Handle transaction.completed
 * Payment successful (renewal or new)
 */
async function handleTransactionCompleted(transaction: any) {
  console.log('🔄 [PADDLE WEBHOOK] transaction.completed:', transaction.id);

  // Get subscription from transaction
  const subscriptionId = transaction.subscription_id;
  if (!subscriptionId) {
    return; // Not a subscription transaction
  }

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('subscription_id', subscriptionId)
    .eq('provider', 'paddle')
    .single();

  if (!subscription) {
    console.error('Subscription not found for transaction:', subscriptionId);
    return;
  }

  // Update subscription status to active
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('subscription_id', subscriptionId)
    .eq('provider', 'paddle');

  // Update user plan
  await updateUserPlan(subscription.user_id, subscription.plan_id as 'pro' | 'team', 'active');

  // Create invoice record
  await createOrUpdateInvoice(transaction, subscription.user_id);
}

/**
 * Handle transaction.payment_failed
 * Payment failed
 */
async function handleTransactionPaymentFailed(transaction: any) {
  console.log('🔄 [PADDLE WEBHOOK] transaction.payment_failed:', transaction.id);

  const subscriptionId = transaction.subscription_id;
  if (!subscriptionId) {
    return;
  }

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('subscription_id', subscriptionId)
    .eq('provider', 'paddle')
    .single();

  if (!subscription) {
    return;
  }

  // Update subscription status to past_due
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('subscription_id', subscriptionId)
    .eq('provider', 'paddle');

  await updateUserPlan(subscription.user_id, null, 'past_due');

  console.log(`⚠️ [PADDLE WEBHOOK] Payment failed for user ${subscription.user_id}`);
}

/**
 * Create or update subscription record
 */
async function createOrUpdateSubscription(subscription: any, userId: string) {
  const planId = determinePlanIdFromPriceId(subscription.items[0]?.price_id);
  if (!planId || (planId !== 'pro' && planId !== 'team')) {
    console.error('Invalid plan_id determined from price_id');
    return;
  }

  // Convert Paddle status to our status format
  const status = mapPaddleStatusToOurStatus(subscription.status);

  const subscriptionData = {
    user_id: userId,
    provider: 'paddle',
    subscription_id: subscription.id,
    customer_id: subscription.customer_id,
    plan_id: planId,
    status: status,
    current_period_start: subscription.current_billing_period?.starts_at 
      ? new Date(subscription.current_billing_period.starts_at).toISOString()
      : new Date().toISOString(),
    current_period_end: subscription.current_billing_period?.ends_at
      ? new Date(subscription.current_billing_period.ends_at).toISOString()
      : new Date().toISOString(),
    cancel_at_period_end: subscription.scheduled_change?.action === 'cancel',
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at).toISOString() : null,
    trial_end: subscription.trial_dates?.ends_at ? new Date(subscription.trial_dates.ends_at).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'provider,subscription_id',
    });

  if (error) {
    console.error('Error creating/updating subscription:', error);
    throw error;
  }
}

/**
 * Map Paddle subscription status to our status format
 */
function mapPaddleStatusToOurStatus(paddleStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'canceled': 'canceled',
    'past_due': 'past_due',
    'paused': 'paused',
    'trialing': 'trialing',
  };
  return statusMap[paddleStatus] || 'active';
}

/**
 * Determine plan ID from Paddle price ID
 */
function determinePlanIdFromPriceId(priceId: string | undefined): 'pro' | 'team' | null {
  if (!priceId) return null;
  
  // Compare with configured price IDs
  const proPriceId = process.env.PADDLE_PRICE_ID_PRO;
  const teamPriceId = process.env.PADDLE_PRICE_ID_TEAM;
  
  if (priceId === proPriceId) return 'pro';
  if (priceId === teamPriceId) return 'team';
  
  return null;
}

/**
 * Update user plan and subscription status
 */
async function updateUserPlan(userId: string, planId: 'pro' | 'team' | 'free' | null, subscriptionStatus: string) {
  const updateData: any = {
    payment_provider: 'paddle',
    subscription_status: subscriptionStatus === 'active' ? subscriptionStatus : null,
    updated_at: new Date().toISOString(),
  };

  if (planId === 'free') {
    updateData.plan = 'free';
    updateData.subscription_status = null;
    updateData.subscription_current_period_end = null;
  } else if (planId === 'pro' || planId === 'team') {
    updateData.plan = planId;
    // Get current period end from subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('current_period_end')
      .eq('user_id', userId)
      .eq('provider', 'paddle')
      .eq('status', 'active')
      .single();

    if (subscription) {
      updateData.subscription_current_period_end = subscription.current_period_end;
    }
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user plan:', error);
    throw error;
  }
}

/**
 * Create or update invoice record
 */
async function createOrUpdateInvoice(transaction: any, userId: string) {
  const invoiceData = {
    user_id: userId,
    provider: 'paddle',
    invoice_id: transaction.id,
    subscription_id: transaction.subscription_id || null,
    amount_paid: Math.round(transaction.totals?.total || 0), // Paddle uses smallest currency unit (cents for USD)
    currency: transaction.currency_code?.toLowerCase() || 'usd',
    status: transaction.status === 'completed' ? 'paid' : 'open',
    invoice_pdf_url: transaction.receipt_data?.receipt_url || null,
    hosted_invoice_url: transaction.receipt_data?.receipt_url || null,
    period_start: transaction.billing_period?.starts_at 
      ? new Date(transaction.billing_period.starts_at).toISOString()
      : null,
    period_end: transaction.billing_period?.ends_at
      ? new Date(transaction.billing_period.ends_at).toISOString()
      : null,
    paid_at: transaction.paid_at ? new Date(transaction.paid_at).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  // Note: We need to update the invoices table schema to support provider
  // For now, use a workaround or update schema first
  const { error } = await supabaseAdmin
    .from('invoices')
    .upsert(invoiceData as any, {
      onConflict: 'provider,invoice_id',
    });

  if (error) {
    console.error('Error creating/updating invoice:', error);
    // Don't throw - invoice creation is not critical
  }
}

// Disable body parsing, we need the raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

