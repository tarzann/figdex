-- Create users table with API key support
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT,
  api_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on api_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  TO authenticated
  FOR SELECT USING (
    auth.uid() = id
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  TO authenticated
  FOR UPDATE USING (
    auth.uid() = id
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

-- Service role can insert/update/delete (for registration)
CREATE POLICY "Service role can manage users" ON users
  TO service_role
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql'
SET search_path = public;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample user for testing (optional)
-- INSERT INTO users (id, email, full_name, company, api_key, permissions) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'admin@example.com',
--   'Admin User',
--   'Indexo',
--   'indexo_test_key_123',
--   '{"can_upload": true, "can_view": true, "can_manage": true}'
-- );
