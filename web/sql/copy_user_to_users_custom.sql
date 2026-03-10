-- Copy user from users to users_custom with required fields
INSERT INTO users_custom (id, email, full_name, api_key, is_active, provider)
SELECT id, email, full_name, api_key, true, 'email'
FROM users 
WHERE email = 'ran.3dcube@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  api_key = EXCLUDED.api_key,
  is_active = EXCLUDED.is_active,
  provider = EXCLUDED.provider;

