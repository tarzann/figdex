-- Create addon_packages table for managing add-on packages
-- Stores predefined add-on options that users can purchase

CREATE TABLE IF NOT EXISTS addon_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_type VARCHAR NOT NULL CHECK (addon_type IN ('files', 'frames', 'rate_limit')),
  addon_value INTEGER NOT NULL CHECK (addon_value > 0),
  price_usd DECIMAL(10, 2) NOT NULL CHECK (price_usd >= 0),
  display_name VARCHAR, -- e.g., "+1 File", "+1,000 Frames"
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(addon_type, addon_value)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_addon_packages_type ON addon_packages(addon_type);
CREATE INDEX IF NOT EXISTS idx_addon_packages_enabled ON addon_packages(enabled);
CREATE INDEX IF NOT EXISTS idx_addon_packages_sort_order ON addon_packages(sort_order);

-- Update updated_at on update
CREATE OR REPLACE FUNCTION update_addon_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_addon_packages_updated_at
  BEFORE UPDATE ON addon_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_addon_packages_updated_at();

-- Comments
COMMENT ON TABLE addon_packages IS 'Predefined add-on packages that users can purchase';
COMMENT ON COLUMN addon_packages.addon_type IS 'Type: files, frames, or rate_limit';
COMMENT ON COLUMN addon_packages.addon_value IS 'Value (e.g., 1 file, 1000 frames, 10 indexes)';
COMMENT ON COLUMN addon_packages.display_name IS 'Display name for the package (e.g., "+1 File", "+1,000 Frames")';
COMMENT ON COLUMN addon_packages.enabled IS 'Whether this package is available for purchase';

-- Insert default packages
INSERT INTO addon_packages (addon_type, addon_value, price_usd, display_name, sort_order) VALUES
('files', 1, 5.00, '+1 File', 100),
('files', 2, 9.00, '+2 Files', 200),
('files', 5, 20.00, '+5 Files', 300)
ON CONFLICT (addon_type, addon_value) DO NOTHING;

INSERT INTO addon_packages (addon_type, addon_value, price_usd, display_name, sort_order) VALUES
('frames', 1000, 3.00, '+1,000 Frames', 100),
('frames', 2000, 5.00, '+2,000 Frames', 200),
('frames', 5000, 10.00, '+5,000 Frames', 300)
ON CONFLICT (addon_type, addon_value) DO NOTHING;

INSERT INTO addon_packages (addon_type, addon_value, price_usd, display_name, sort_order) VALUES
('rate_limit', 10, 2.00, '+10/Day', 100),
('rate_limit', 20, 3.00, '+20/Day', 200),
('rate_limit', 50, 5.00, '+50/Day', 300)
ON CONFLICT (addon_type, addon_value) DO NOTHING;

