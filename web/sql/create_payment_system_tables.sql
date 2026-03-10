-- Payment System Database Schema
-- Creates all tables needed for Stripe payment integration

-- ============================================================================
-- 1. Payment Customers Table (works with both Stripe and Paddle)
-- Links users to payment provider customer IDs
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR NOT NULL CHECK (provider IN ('stripe', 'paddle')),
  customer_id VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_customers_user_id ON payment_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_customers_provider_customer ON payment_customers(provider, customer_id);

COMMENT ON TABLE payment_customers IS 'Links FigDex users to payment provider customer records (Stripe or Paddle)';
COMMENT ON COLUMN payment_customers.provider IS 'Payment provider: stripe or paddle';
COMMENT ON COLUMN payment_customers.customer_id IS 'Customer ID from provider (e.g., cus_... for Stripe, ctm_... for Paddle)';
COMMENT ON COLUMN payment_customers.email IS 'Email address at time of customer creation';

-- Keep old table name for backward compatibility (if it exists)
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

COMMENT ON TABLE stripe_customers IS 'DEPRECATED: Use payment_customers instead. Links FigDex users to Stripe customer records';

-- ============================================================================
-- 2. Subscriptions Table
-- Tracks user subscriptions (Pro, Team plans)
-- Works with both Stripe and Paddle
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR NOT NULL CHECK (provider IN ('stripe', 'paddle')),
  subscription_id VARCHAR NOT NULL,
  customer_id VARCHAR NOT NULL,
  plan_id VARCHAR NOT NULL CHECK (plan_id IN ('pro', 'team')),
  status VARCHAR NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired', 'paused')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription ON subscriptions(provider, subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

COMMENT ON TABLE subscriptions IS 'Tracks user subscriptions to Pro/Team plans (Stripe or Paddle)';
COMMENT ON COLUMN subscriptions.provider IS 'Payment provider: stripe or paddle';
COMMENT ON COLUMN subscriptions.subscription_id IS 'Subscription ID from provider (e.g., sub_... for Stripe, sub_... for Paddle)';
COMMENT ON COLUMN subscriptions.status IS 'Current subscription status from provider';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'If true, subscription will cancel at end of current period';

-- ============================================================================
-- 3. Subscription Items Table
-- Links subscriptions to Stripe subscription items (for add-ons)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_addon_id UUID REFERENCES user_addons(id) ON DELETE SET NULL,
  stripe_subscription_item_id VARCHAR NOT NULL UNIQUE,
  stripe_price_id VARCHAR NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id ON subscription_items(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_user_addon_id ON subscription_items(user_addon_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_stripe_id ON subscription_items(stripe_subscription_item_id);

COMMENT ON TABLE subscription_items IS 'Links subscriptions to Stripe subscription items (for add-ons)';
COMMENT ON COLUMN subscription_items.stripe_subscription_item_id IS 'Stripe subscription item ID (si_...)';
COMMENT ON COLUMN subscription_items.user_addon_id IS 'Links to user_addons table if this is an add-on subscription item';

-- ============================================================================
-- 4. Invoices Table
-- Stores invoice information from Stripe
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR NOT NULL UNIQUE,
  stripe_subscription_id VARCHAR,
  amount_paid INTEGER NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'usd',
  status VARCHAR NOT NULL CHECK (status IN ('paid', 'open', 'void', 'uncollectible', 'draft')),
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(stripe_subscription_id);

COMMENT ON TABLE invoices IS 'Stores invoice information from Stripe';
COMMENT ON COLUMN invoices.stripe_invoice_id IS 'Stripe invoice ID (in_...)';
COMMENT ON COLUMN invoices.amount_paid IS 'Amount paid in cents (e.g., 2900 = $29.00)';
COMMENT ON COLUMN invoices.invoice_pdf_url IS 'URL to download invoice PDF';
COMMENT ON COLUMN invoices.hosted_invoice_url IS 'URL to view invoice on Stripe website';

-- ============================================================================
-- 5. Payment Methods Table (Optional, for future use)
-- Stores payment methods for users
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR NOT NULL UNIQUE,
  type VARCHAR NOT NULL CHECK (type IN ('card')),
  card_last4 VARCHAR(4),
  card_brand VARCHAR,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);

COMMENT ON TABLE payment_methods IS 'Stores payment methods for users (optional, for future use)';
COMMENT ON COLUMN payment_methods.stripe_payment_method_id IS 'Stripe payment method ID (pm_...)';

-- ============================================================================
-- 6. Update existing tables
-- ============================================================================

-- Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR; -- DEPRECATED: kept for backward compatibility
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_provider VARCHAR CHECK (payment_provider IN ('stripe', 'paddle', null));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'unpaid', 'trialing', null));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_payment_provider ON users(payment_provider);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

COMMENT ON COLUMN users.stripe_customer_id IS 'DEPRECATED: Use payment_customers table instead. Stripe customer ID (for quick lookup)';
COMMENT ON COLUMN users.payment_provider IS 'Payment provider currently used: stripe or paddle';
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status (denormalized from subscriptions table)';

-- Update user_addons table (if stripe_subscription_item_id doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_addons' AND column_name = 'stripe_subscription_item_id'
  ) THEN
    ALTER TABLE user_addons ADD COLUMN stripe_subscription_item_id VARCHAR;
    ALTER TABLE user_addons ADD COLUMN stripe_price_id VARCHAR;
    
    CREATE INDEX IF NOT EXISTS idx_user_addons_stripe_item_id ON user_addons(stripe_subscription_item_id);
    
    COMMENT ON COLUMN user_addons.stripe_subscription_item_id IS 'Stripe subscription item ID (si_...)';
    COMMENT ON COLUMN user_addons.stripe_price_id IS 'Stripe price ID (price_...)';
  END IF;
END $$;

-- Update addon_packages table (if stripe_price_id doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'addon_packages' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE addon_packages ADD COLUMN stripe_price_id VARCHAR;
    ALTER TABLE addon_packages ADD COLUMN stripe_product_id VARCHAR;
    
    CREATE INDEX IF NOT EXISTS idx_addon_packages_stripe_price_id ON addon_packages(stripe_price_id);
    
    COMMENT ON COLUMN addon_packages.stripe_price_id IS 'Stripe price ID (price_...)';
    COMMENT ON COLUMN addon_packages.stripe_product_id IS 'Stripe product ID (prod_...)';
  END IF;
END $$;

-- ============================================================================
-- 7. Update triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stripe_customers_updated_at
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_subscription_items_updated_at
  BEFORE UPDATE ON subscription_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (we check user_id in API endpoints)
CREATE POLICY "Service role can manage stripe_customers" ON stripe_customers
  FOR ALL USING (true);

CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (true);

CREATE POLICY "Service role can manage subscription_items" ON subscription_items
  FOR ALL USING (true);

CREATE POLICY "Service role can manage invoices" ON invoices
  FOR ALL USING (true);

CREATE POLICY "Service role can manage payment_methods" ON payment_methods
  FOR ALL USING (true);

