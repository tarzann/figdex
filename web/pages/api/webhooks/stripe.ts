import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { stripe, verifyWebhookSignature, getWebhookSecret } from '../../../lib/stripe';
import { getRawBody } from '../../../lib/webhook-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Stripe Webhook Handler
 * Handles all Stripe webhook events for payment processing
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    // Get raw body for webhook signature verification
    // Note: We expect the body to be a string or Buffer when bodyParser is disabled
    const rawBody = typeof req.body === 'string' ? req.body : 
                     Buffer.isBuffer(req.body) ? req.body :
                     await getRawBody(req);
    
    // Verify webhook signature
    const webhookSecret = getWebhookSecret();
    event = verifyWebhookSignature(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook event:', error);
    return res.status(500).json({ error: `Webhook handler error: ${error.message}` });
  }
}

/**
 * Handle checkout.session.completed
 * User completed checkout (subscription or add-on)
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('🔄 [WEBHOOK] checkout.session.completed:', session.id);

  if (session.mode !== 'subscription') {
    console.log('Skipping non-subscription checkout session');
    return;
  }

  const userId = session.metadata?.user_id;
  const planId = session.metadata?.plan_id as 'pro' | 'team' | undefined;
  const subscriptionId = session.subscription as string;

  if (!userId || !planId || !subscriptionId) {
    console.error('Missing required metadata in checkout session:', { userId, planId, subscriptionId });
    return;
  }

  // Fetch subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Create or update subscription record
  await createOrUpdateSubscription(subscription, userId);

  // Update user plan immediately
  await updateUserPlan(userId, planId, subscription.status);

  console.log(`✅ [WEBHOOK] Subscription created for user ${userId}, plan: ${planId}`);
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🔄 [WEBHOOK] customer.subscription.created:', subscription.id);

  const userId = subscription.metadata.user_id;
  if (!userId) {
    console.error('Missing user_id in subscription metadata');
    return;
  }

  await createOrUpdateSubscription(subscription, userId);

  const planId = subscription.metadata.plan_id as 'pro' | 'team' | undefined;
  if (planId) {
    await updateUserPlan(userId, planId, subscription.status);
  }
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 [WEBHOOK] customer.subscription.updated:', subscription.id);

  const userId = subscription.metadata.user_id;
  if (!userId) {
    console.error('Missing user_id in subscription metadata');
    return;
  }

  await createOrUpdateSubscription(subscription, userId);

  const planId = subscription.metadata.plan_id as 'pro' | 'team' | undefined;
  if (planId) {
    await updateUserPlan(userId, planId, subscription.status);
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🔄 [WEBHOOK] customer.subscription.deleted:', subscription.id);

  const userId = subscription.metadata.user_id;
  if (!userId) {
    console.error('Missing user_id in subscription metadata');
    return;
  }

  // Update subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider', 'stripe')
    .eq('subscription_id', subscription.id);

  // Downgrade user to Free plan
  await updateUserPlan(userId, 'free', 'canceled');

  console.log(`✅ [WEBHOOK] Subscription cancelled for user ${userId}`);
}

/**
 * Handle invoice.payment_succeeded
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('🔄 [WEBHOOK] invoice.payment_succeeded:', invoice.id);

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) {
    console.error('Missing customer ID in invoice');
    return;
  }

  // Get user from Stripe customer ID
  const { data: stripeCustomer } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!stripeCustomer) {
    console.error('Stripe customer not found:', customerId);
    return;
  }

  // Create or update invoice record
  await createOrUpdateInvoice(invoice, stripeCustomer.user_id);

  // Update subscription status to active
  const subscriptionId = (invoice as any).subscription 
    ? (typeof (invoice as any).subscription === 'string' 
        ? (invoice as any).subscription 
        : (invoice as any).subscription?.id)
    : null;
  if (subscriptionId) {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('provider', 'stripe')
      .eq('subscription_id', subscriptionId);
  }
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('🔄 [WEBHOOK] invoice.payment_failed:', invoice.id);

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) {
    console.error('Missing customer ID in invoice');
    return;
  }

  // Get user from Stripe customer ID
  const { data: stripeCustomer } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!stripeCustomer) {
    console.error('Stripe customer not found:', customerId);
    return;
  }

  // Update subscription status to past_due
  const subscriptionId = (invoice as any).subscription 
    ? (typeof (invoice as any).subscription === 'string' 
        ? (invoice as any).subscription 
        : (invoice as any).subscription?.id)
    : null;
  if (subscriptionId) {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('provider', 'stripe')
      .eq('subscription_id', subscriptionId);

    await updateUserPlan(stripeCustomer.user_id, null, 'past_due');
  }

  // TODO: Send payment failed email to user
  console.log(`⚠️ [WEBHOOK] Payment failed for user ${stripeCustomer.user_id}`);
}

/**
 * Handle invoice.created
 */
async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  console.log('🔄 [WEBHOOK] invoice.created:', invoice.id);

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) {
    return;
  }

  const { data: stripeCustomer } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (stripeCustomer) {
    await createOrUpdateInvoice(invoice, stripeCustomer.user_id);
  }
}

/**
 * Create or update subscription record
 */
async function createOrUpdateSubscription(subscription: Stripe.Subscription, userId: string) {
  const planId = subscription.metadata.plan_id as 'pro' | 'team' | undefined;
  if (!planId || (planId !== 'pro' && planId !== 'team')) {
    console.error('Invalid plan_id in subscription metadata:', planId);
    return;
  }

  const subscriptionData = {
    user_id: userId,
    provider: 'stripe',
    subscription_id: subscription.id,
    customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    plan_id: planId,
    status: subscription.status,
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    trial_end: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
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
 * Update user plan and subscription status
 */
async function updateUserPlan(userId: string, planId: 'pro' | 'team' | 'free' | null, subscriptionStatus: string) {
  const updateData: any = {
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
async function createOrUpdateInvoice(invoice: Stripe.Invoice, userId: string) {
  const subscriptionIdForInvoice = (invoice as any).subscription 
    ? (typeof (invoice as any).subscription === 'string' 
        ? (invoice as any).subscription 
        : (invoice as any).subscription?.id)
    : null;
  
  const invoiceData = {
    user_id: userId,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscriptionIdForInvoice,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    invoice_pdf_url: invoice.invoice_pdf || null,
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    paid_at: invoice.status === 'paid' && invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('invoices')
    .upsert(invoiceData, {
      onConflict: 'stripe_invoice_id',
    });

  if (error) {
    console.error('Error creating/updating invoice:', error);
    throw error;
  }
}

// Disable body parsing, we need the raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

