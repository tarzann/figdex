import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromApiKey } from '../../../lib/api-auth';
import { stripe, getStripePriceId, getOrCreateStripeCustomer, PlanId } from '../../../lib/stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const userId = await getUserIdFromApiKey(req);

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { plan_id, success_url, cancel_url } = req.body;

    // Validate plan_id
    if (!plan_id || (plan_id !== 'pro' && plan_id !== 'team')) {
      return res.status(400).json({ success: false, error: 'Invalid plan_id. Must be "pro" or "team"' });
    }

    // Get user information
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ success: false, error: 'Failed to fetch user information' });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.full_name || undefined
    );

    // Store Stripe customer ID in database
    const { error: customerUpdateError } = await supabaseAdmin
      .from('stripe_customers')
      .upsert({
        user_id: user.id,
        stripe_customer_id: customer.id,
        email: user.email,
      }, {
        onConflict: 'user_id',
      });

    if (customerUpdateError) {
      console.error('Error storing Stripe customer:', customerUpdateError);
      // Continue anyway, this is not critical
    }

    // Update users table with stripe_customer_id
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id);

    // Get Stripe price ID for plan
    const priceId = getStripePriceId(plan_id as PlanId);

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.origin || 'http://localhost:3000';
    const defaultSuccessUrl = `${baseUrl}/account?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${baseUrl}/pricing`;

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: success_url || defaultSuccessUrl,
      cancel_url: cancel_url || defaultCancelUrl,
      metadata: {
        user_id: user.id,
        plan_id: plan_id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
        },
      },
    });

    return res.status(200).json({
      success: true,
      session_id: session.id,
      session_url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create checkout session',
    });
  }
}

