-- Add public link fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;

-- Optional index for faster lookups by slug
CREATE INDEX IF NOT EXISTS idx_users_public_slug ON users(public_slug);


