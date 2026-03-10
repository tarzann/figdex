import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, fullName, company } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate API key
    const apiKey = generateApiKey();

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company: company || null
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    // Insert user data into users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        full_name: fullName,
        company: company || null,
        api_key: apiKey,
        is_active: true,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      // Try to delete the auth user if insert fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // Send admin notification about new user registration
    try {
      const { sendUserRegistrationNotificationToAdmin } = await import('../../lib/email');
      await sendUserRegistrationNotificationToAdmin({
        userEmail: email,
        userName: fullName,
        userId: authUser.user.id,
        registrationDate: new Date().toISOString(),
      });
    } catch (notificationError) {
      // Don't fail registration if notification fails
      console.error('Failed to send admin notification:', notificationError);
    }

    // Return success with API key
    res.status(201).json({
      message: 'User created successfully',
      apiKey: apiKey,
      userId: authUser.user.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateApiKey(): string {
  // Generate a secure API key
  const prefix = 'figdex_';
  const randomBytes = crypto.randomBytes(32);
  const suffix = randomBytes.toString('hex');
  return prefix + suffix;
}
