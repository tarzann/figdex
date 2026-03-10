-- Create user_addons table for managing subscription add-ons
-- Allows users to purchase additional files, frames, or rate limits

CREATE TABLE IF NOT EXISTS user_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addon_type VARCHAR NOT NULL CHECK (addon_type IN ('files', 'frames', 'rate_limit')),
  addon_value INTEGER NOT NULL CHECK (addon_value > 0),
  price_usd DECIMAL(10, 2) NOT NULL CHECK (price_usd >= 0),
  stripe_subscription_id VARCHAR(255), -- For recurring payments
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- null = recurring monthly, or specific end date
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT user_addons_unique_active UNIQUE(user_id, addon_type, addon_value, start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_addons_user_id ON user_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addons_status ON user_addons(status);
CREATE INDEX IF NOT EXISTS idx_user_addons_type ON user_addons(addon_type);
CREATE INDEX IF NOT EXISTS idx_user_addons_dates ON user_addons(start_date, end_date);

-- Update updated_at on update
CREATE OR REPLACE FUNCTION update_user_addons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_addons_updated_at
  BEFORE UPDATE ON user_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_user_addons_updated_at();

-- Comments
COMMENT ON TABLE user_addons IS 'User subscription add-ons (additional files, frames, rate limits)';
COMMENT ON COLUMN user_addons.addon_type IS 'Type: files, frames, or rate_limit';
COMMENT ON COLUMN user_addons.addon_value IS 'Value (e.g., 5 files, 1000 frames, 10 indexes)';
COMMENT ON COLUMN user_addons.status IS 'Status: active, cancelled, expired, pending';
COMMENT ON COLUMN user_addons.end_date IS 'null = recurring monthly, or specific end date';

