-- Insert default addon packages
-- This script adds the default add-on packages if they don't already exist
-- Run this after creating the addon_packages table

-- Files packages
INSERT INTO addon_packages (addon_type, addon_value, price_usd, display_name, sort_order) VALUES
('files', 1, 5.00, '+1 File', 100),
('files', 2, 9.00, '+2 Files', 200),
('files', 5, 20.00, '+5 Files', 300)
ON CONFLICT (addon_type, addon_value) DO NOTHING;

-- Frames packages
INSERT INTO addon_packages (addon_type, addon_value, price_usd, display_name, sort_order) VALUES
('frames', 1000, 3.00, '+1,000 Frames', 100),
('frames', 2000, 5.00, '+2,000 Frames', 200),
('frames', 5000, 10.00, '+5,000 Frames', 300)
ON CONFLICT (addon_type, addon_value) DO NOTHING;

-- Rate limit packages
INSERT INTO addon_packages (addon_type, addon_value, price_usd, display_name, sort_order) VALUES
('rate_limit', 10, 2.00, '+10/Day', 100),
('rate_limit', 20, 3.00, '+20/Day', 200),
('rate_limit', 50, 5.00, '+50/Day', 300)
ON CONFLICT (addon_type, addon_value) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  price_usd = EXCLUDED.price_usd,
  sort_order = EXCLUDED.sort_order;

