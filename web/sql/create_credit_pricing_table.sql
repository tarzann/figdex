-- Create credit_pricing table for managing credit costs per action
-- This allows admins to manage pricing without code changes

CREATE TABLE IF NOT EXISTS credit_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'FILE_INDEX', 'FILE_REINDEX', etc.
  action_name VARCHAR(255) NOT NULL, -- Human-readable name
  credits INTEGER NOT NULL CHECK (credits > 0),
  description TEXT,
  enabled BOOLEAN DEFAULT true, -- Admin can enable/disable pricing
  sort_order INTEGER DEFAULT 0, -- For ordering in admin UI
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT credit_pricing_action_key_length CHECK (char_length(action_key) >= 1 AND char_length(action_key) <= 255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_pricing_action_key ON credit_pricing(action_key);
CREATE INDEX IF NOT EXISTS idx_credit_pricing_enabled ON credit_pricing(enabled);
CREATE INDEX IF NOT EXISTS idx_credit_pricing_sort_order ON credit_pricing(sort_order);

-- Update updated_at on update
CREATE OR REPLACE FUNCTION update_credit_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_credit_pricing_updated_at
  BEFORE UPDATE ON credit_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_pricing_updated_at();

-- Insert default pricing (matching lib/plans.ts)
INSERT INTO credit_pricing (action_key, action_name, credits, description, sort_order) VALUES
  ('FILE_INDEX', 'File Index (New)', 100, 'Creating a new index for a Figma file', 1),
  ('FILE_REINDEX', 'File Re-index', 50, 'Re-indexing an existing file (50% discount)', 2),
  ('ADD_FILE_QUOTA', 'Add File Quota (+1)', 200, 'Monthly quota: +1 file', 3),
  ('ADD_2_FILES_QUOTA', 'Add File Quota (+2)', 350, 'Monthly quota: +2 files', 4),
  ('ADD_5_FILES_QUOTA', 'Add File Quota (+5)', 800, 'Monthly quota: +5 files', 5),
  ('ADD_1000_FRAMES_QUOTA', 'Add Frames Quota (+1,000)', 150, 'Monthly quota: +1,000 frames', 6),
  ('ADD_2000_FRAMES_QUOTA', 'Add Frames Quota (+2,000)', 280, 'Monthly quota: +2,000 frames', 7),
  ('ADD_5000_FRAMES_QUOTA', 'Add Frames Quota (+5,000)', 600, 'Monthly quota: +5,000 frames', 8),
  ('TEAM_ADD_FILE_QUOTA', 'Team: Add File Quota (+1)', 150, 'Team plan: Monthly quota: +1 file (discounted)', 9),
  ('TEAM_ADD_2_FILES_QUOTA', 'Team: Add File Quota (+2)', 300, 'Team plan: Monthly quota: +2 files (discounted)', 10),
  ('TEAM_ADD_1000_FRAMES_QUOTA', 'Team: Add Frames Quota (+1,000)', 120, 'Team plan: Monthly quota: +1,000 frames (discounted)', 11)
ON CONFLICT (action_key) DO NOTHING;

-- Comments
COMMENT ON TABLE credit_pricing IS 'Credit costs for different actions (configurable by admin)';
COMMENT ON COLUMN credit_pricing.action_key IS 'Unique key for the action (e.g., FILE_INDEX, FILE_REINDEX)';
COMMENT ON COLUMN credit_pricing.credits IS 'Number of credits required for this action';
COMMENT ON COLUMN credit_pricing.enabled IS 'Whether this pricing is active';

