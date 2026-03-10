-- Create credits_packages table for managing credit packages
-- This allows admins to manage credit packages without code changes

CREATE TABLE IF NOT EXISTS credits_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  price_usd DECIMAL(10, 2) NOT NULL CHECK (price_usd >= 0),
  stripe_price_id VARCHAR(255), -- Stripe Price ID (for payment integration)
  description TEXT,
  featured BOOLEAN DEFAULT false, -- Highlight this package
  popular BOOLEAN DEFAULT false, -- Mark as "popular" or "best value"
  enabled BOOLEAN DEFAULT true, -- Admin can enable/disable packages
  sort_order INTEGER DEFAULT 0, -- For ordering packages
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT credits_packages_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credits_packages_enabled ON credits_packages(enabled);
CREATE INDEX IF NOT EXISTS idx_credits_packages_sort_order ON credits_packages(sort_order);

-- Update updated_at on update
CREATE OR REPLACE FUNCTION update_credits_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_credits_packages_updated_at
  BEFORE UPDATE ON credits_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_credits_packages_updated_at();

-- Insert default packages
INSERT INTO credits_packages (name, credits, price_usd, description, featured, popular, sort_order)
VALUES
  ('Starter', 500, 10.00, 'Perfect for occasional use', false, false, 1),
  ('Standard', 1000, 18.00, 'Great value for regular users', false, true, 2),
  ('Professional', 2000, 35.00, 'Best for heavy users', false, false, 3),
  ('Enterprise', 5000, 80.00, 'Maximum credits for teams', true, false, 4)
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE credits_packages IS 'Credit packages available for purchase';
COMMENT ON COLUMN credits_packages.stripe_price_id IS 'Stripe Price ID for payment processing (when payment is integrated)';
COMMENT ON COLUMN credits_packages.featured IS 'Whether this package should be featured/highlighted';
COMMENT ON COLUMN credits_packages.popular IS 'Whether this package should be marked as popular/best value';
COMMENT ON COLUMN credits_packages.enabled IS 'Whether this package is available for purchase';

