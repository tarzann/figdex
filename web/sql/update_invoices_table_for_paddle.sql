-- Update invoices table to support both Stripe and Paddle
-- Run this after create_payment_system_tables.sql

-- Add provider column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'provider'
  ) THEN
    -- Add provider column
    ALTER TABLE invoices ADD COLUMN provider VARCHAR CHECK (provider IN ('stripe', 'paddle')) DEFAULT 'stripe';
    
    -- Update existing records to have provider = 'stripe'
    UPDATE invoices SET provider = 'stripe' WHERE provider IS NULL;
    
    -- Make provider NOT NULL after setting defaults
    ALTER TABLE invoices ALTER COLUMN provider SET NOT NULL;
    
    -- Drop old unique constraint if exists
    ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_stripe_invoice_id_key;
    
    -- Add new unique constraint with provider
    ALTER TABLE invoices ADD CONSTRAINT invoices_provider_invoice_id_key UNIQUE (provider, invoice_id);
    
    -- Rename stripe_invoice_id to invoice_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'invoices' AND column_name = 'stripe_invoice_id'
    ) THEN
      ALTER TABLE invoices RENAME COLUMN stripe_invoice_id TO invoice_id;
    END IF;
    
    -- Rename stripe_subscription_id to subscription_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'invoices' AND column_name = 'stripe_subscription_id'
    ) THEN
      ALTER TABLE invoices RENAME COLUMN stripe_subscription_id TO subscription_id;
    END IF;
    
    -- Drop old indexes
    DROP INDEX IF EXISTS idx_invoices_stripe_id;
    
    -- Create new indexes with provider
    CREATE INDEX IF NOT EXISTS idx_invoices_provider_invoice ON invoices(provider, invoice_id);
    
    -- Update comments
    COMMENT ON COLUMN invoices.provider IS 'Payment provider: stripe or paddle';
    COMMENT ON COLUMN invoices.invoice_id IS 'Invoice ID from provider (e.g., in_... for Stripe, txn_... for Paddle)';
    
  END IF;
END $$;

