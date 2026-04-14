import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const withTimeout = async <T,>(promise: PromiseLike<T>, fallback: T): Promise<T> => {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 2500)),
    ]);
  } catch {
    return fallback;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables at runtime
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!serviceUrl || !serviceKey) {
    console.error('[auth/signup] Missing Supabase credentials:', {
      hasUrl: !!serviceUrl,
      hasServiceKey: !!serviceKey
    });
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Missing Supabase credentials',
      details: 'Please check environment variables in Vercel dashboard'
    });
  }

  // Server-side admin client (service role) for safe RLS-bypassing mutations
  const admin = createClient(serviceUrl, serviceKey);

  try {
    let { email, password, name, action, userId: providedUserId } = req.body || {};
    if (typeof email === 'string') {
      email = email.trim().toLowerCase();
    }
    const authUserId = typeof providedUserId === 'string' ? providedUserId.trim() : '';
    const displayName = name || (typeof email === 'string' ? email.split('@')[0] : '');
    console.log('[auth/signup] incoming request', { action, email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (action === 'signup') {
      // Validate password
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long'
        });
      }

      // Check if user already exists in users table
      const { data: existingUser } = await admin
        .from('users')
        .select('id, email, provider')
        .eq('email', email)
        .maybeSingle();

      // If user exists in users table, they already have an account
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists. Please sign in instead.',
          code: 'ACCOUNT_EXISTS'
        });
      }

      // Create user in Supabase Auth first (if password is provided and not 'oauth')
      let authUserId: string | null = null;
      if (password && password !== 'oauth') {
        try {
          const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              full_name: displayName
            }
          });

          if (authError) {
            // Check if user already exists in auth (check by code, status, and message)
            const isEmailExists = authError.code === 'email_exists' || 
                                  authError.status === 422 ||
                                  authError.message?.includes('already registered') || 
                                  authError.message?.includes('already exists') || 
                                  authError.message?.includes('User already registered') ||
                                  authError.message?.includes('email address is already registered');
            
            if (isEmailExists) {
              console.log('[auth/signup] User already exists in Auth, checking users table:', { email, code: authError.code, status: authError.status });
              
              // User exists in auth - this means they registered with Google or another method
              // Check if they exist in users table (might be a race condition)
              const { data: checkUser } = await admin
                .from('users')
                .select('id, email')
                .eq('email', email)
                .maybeSingle();
              
              if (checkUser) {
                console.log('[auth/signup] User exists in both Auth and users table');
                return res.status(400).json({
                  success: false,
                  error: 'An account with this email already exists. Please sign in instead.',
                  code: 'ACCOUNT_EXISTS'
                });
              }
              
              // User exists in Auth but not in users table
              // This means they registered with Google OAuth but haven't completed the flow
              // We should not create a duplicate - they should use Google login
              console.log('[auth/signup] User exists in Auth but not in users table - likely Google OAuth');
              return res.status(400).json({
                success: false,
                error: 'An account with this email already exists (registered with Google). Please sign in with Google instead.',
                code: 'ACCOUNT_EXISTS_GOOGLE'
              });
            } else {
              console.error('[auth/signup] auth create error:', {
                message: authError.message,
                code: authError.code,
                status: authError.status
              });
              return res.status(500).json({
                success: false,
                error: 'Failed to create user account',
                details: authError.message || authError.code
              });
            }
          } else if (authData?.user) {
            authUserId = authData.user.id;
            console.log('[auth/signup] Auth user created successfully:', { id: authUserId, email });
          }
        } catch (authErr: any) {
          console.error('[auth/signup] auth create exception:', {
            message: authErr.message,
            code: authErr.code,
            status: authErr.status
          });
          
          // Check if user already exists (check by code, status, and message)
          const isEmailExists = authErr.code === 'email_exists' || 
                                authErr.status === 422 ||
                                authErr.message?.includes('already registered') || 
                                authErr.message?.includes('already exists') ||
                                authErr.message?.includes('User already registered') ||
                                authErr.message?.includes('email address is already registered');
          
          if (isEmailExists) {
            // Check if user exists in users table
            const { data: checkUser } = await admin
              .from('users')
              .select('id, email')
              .eq('email', email)
              .maybeSingle();
            
            if (checkUser) {
              return res.status(400).json({
                success: false,
                error: 'An account with this email already exists. Please sign in instead.',
                code: 'ACCOUNT_EXISTS'
              });
            }
            
            return res.status(400).json({
              success: false,
              error: 'An account with this email already exists (registered with Google). Please sign in with Google instead.',
              code: 'ACCOUNT_EXISTS_GOOGLE'
            });
          }
          
          return res.status(500).json({
            success: false,
            error: 'Failed to create user account',
            details: authErr.message || authErr.code || String(authErr)
          });
        }
      }

      // Generate API key
      const apiKey = `figdex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 36);

      // Validate that we have authUserId (required for foreign key)
      if (!authUserId) {
        console.error('[auth/signup] No authUserId after creating auth user');
        return res.status(500).json({
          success: false,
          error: 'Failed to create user account - authentication error'
        });
      }

      // Create new user in users table
      // Note: id must match auth.users(id) due to foreign key constraint
      // Start with required fields only
      const userData: any = {
        id: authUserId, // Must match auth.users(id) - this is required!
        email,
        full_name: displayName || email.split('@')[0], // Required field
        api_key: apiKey
      };

      // Try to insert with plan if column exists
      console.log('[auth/signup] Attempting to insert user:', { id: userData.id, email: userData.email, hasPlan: true });
      let { data: newUser, error: createError } = await admin
        .from('users')
        .insert({ ...userData, plan: 'free' })
        .select('id, email, full_name, plan, is_admin, api_key')
        .single();

      // If that fails, try without plan (in case column doesn't exist)
      if (createError || !newUser) {
        console.log('[auth/signup] First insert failed, trying without plan:', {
          error: createError?.message,
          code: createError?.code,
          details: createError?.details,
          hint: createError?.hint
        });
        const result = await admin
          .from('users')
          .insert(userData)
          .select('id, email, full_name, is_admin, api_key')
          .single();
        
        if (result.error || !result.data) {
          console.error('[auth/signup] Error creating user in users table:', {
            error: result.error?.message,
            code: result.error?.code,
            details: result.error?.details,
            hint: result.error?.hint,
            fullError: JSON.stringify(result.error)
          });
          return res.status(500).json({
            success: false,
            error: 'Failed to create user profile',
            details: result.error?.message || result.error?.hint || JSON.stringify(result.error) || 'Unknown error',
            code: result.error?.code || 'USER_CREATE_ERROR'
          });
        }
        newUser = { ...result.data, plan: 'free' };
      }

      // Validate that we have newUser
      if (!newUser) {
        console.error('[auth/signup] newUser is null after insert attempts');
        return res.status(500).json({
          success: false,
          error: 'Failed to create user profile',
          details: 'User was not created after all attempts',
          code: 'USER_CREATE_ERROR'
        });
      }

      // Send admin notification about new user registration
      try {
        const { sendUserRegistrationNotificationToAdmin } = await import('../../../lib/email');
        await sendUserRegistrationNotificationToAdmin({
          userEmail: email,
          userName: displayName,
          userId: newUser.id,
          registrationDate: new Date().toISOString(),
        });
      } catch (notificationError) {
        // Don't fail registration if notification fails
        console.error('[auth/signup] Failed to send admin notification:', notificationError);
      }

      console.log('[auth/signup] User created successfully in users table:', { id: newUser.id, email: newUser.email });

      // Ensure response has all expected fields
      const responseUser: any = {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        api_key: newUser.api_key,
        plan: newUser.plan || 'free',
        is_admin: newUser.is_admin || false
      };

      console.log('[auth/signup] signup success', { email, hasAuthUser: !!authUserId });
      res.status(200).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: responseUser.id,
          email: responseUser.email,
          name: responseUser.full_name,
          plan: responseUser.plan,
          api_key: responseUser.api_key
        }
      });

    } else if (action === 'login') {
      // Find existing user or create new one
      console.log('[auth/signup] login start', { email, authUserId });
      let user: any = null;
      
      // Try to find user by id first when Auth already gave us one.
      const byIdResult = authUserId
        ? await withTimeout(
            admin
              .from('users')
              .select('id, email, full_name, plan, is_admin, api_key')
              .eq('id', authUserId)
              .maybeSingle(),
            { data: null, error: null } as any
          )
        : null;

      const byEmailResult = !byIdResult?.data
        ? await withTimeout(
            admin
              .from('users')
              .select('id, email, full_name, plan, is_admin, api_key')
              .eq('email', email)
              .maybeSingle(),
            { data: null, error: { message: 'User email lookup timed out' } } as any
          )
        : null;

      const foundUser = byIdResult?.data || byEmailResult?.data || null;
      const findError = byIdResult?.error || byEmailResult?.error || null;
      if (foundUser) {
        console.log('[auth/signup] found existing user', { email });
      }
      if (findError) {
        console.error('[auth/signup] error fetching user', findError);
      }
      user = foundUser;
      
      // If user doesn't exist, create it
      if (!user) {
        const apiKeyNew = `figdex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 36);
        const insertPayload: any = { email, api_key: apiKeyNew, full_name: displayName, plan: 'free' };
        if (authUserId) {
          insertPayload.id = authUserId;
        }

        const { data: created, error: createErr } = await admin
          .from('users')
          .insert(insertPayload)
          .select('id, email, full_name, plan, is_admin, api_key')
          .single();
        
        if (createErr) {
          console.error('[auth/signup] create user error', createErr);
          // If user already exists (race condition), fetch them
          if (createErr.code === '23505' || createErr.message?.includes('duplicate') || createErr.message?.includes('unique')) {
            const existingResult = authUserId
              ? await withTimeout(
                  admin
                    .from('users')
                    .select('id, email, full_name, plan, is_admin, api_key')
                    .eq('id', authUserId)
                    .maybeSingle(),
                  { data: null, error: null } as any
                )
              : await withTimeout(
                  admin
                    .from('users')
                    .select('id, email, full_name, plan, is_admin, api_key')
                    .eq('email', email)
                    .maybeSingle(),
                  { data: null, error: null } as any
                );
            const existing = existingResult?.data || null;
            if (existing) {
              console.log('[auth/signup] existing user fetched after duplicate insert', { email });
            } else {
              console.warn('[auth/signup] duplicate insert but cannot find user afterwards', { email });
            }
            user = existing;
          } else {
            return res.status(500).json({ success: false, error: 'Failed to create user', details: createErr.message });
          }
        } else {
          user = { ...created, full_name: created.full_name || displayName, plan: created.plan || 'free', is_admin: created.is_admin ?? false };
          console.log('[auth/signup] created user via login flow', { email });
        }
      }
      
      if (!user) {
        console.error('[auth/signup] user still null after create/find', { email });
        return res.status(500).json({ success: false, error: 'Failed to find or create user' });
      }

      // Ensure api_key exists
      let apiKey = user.api_key;
      if (!apiKey || !apiKey.startsWith('figdex_')) {
        apiKey = `figdex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 36);
        try {
          await admin.from('users').update({ api_key: apiKey } as any).eq('id', user.id);
        } catch {}
      }

      if (user?.is_admin && user.plan !== 'unlimited') {
        try {
          await admin.from('users').update({ plan: 'unlimited' }).eq('id', user.id);
        } catch (planErr) {
          console.error('[auth/signup] failed to set unlimited plan for admin', planErr);
        } finally {
          user.plan = 'unlimited';
        }
      }

      const plan = user?.is_admin ? 'unlimited' : (user.plan || 'free');

      console.log('[auth/signup] login success', { email, plan });
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          plan,
          api_key: apiKey
        }
      });

    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "signup" or "login"'
      });
    }

  } catch (error: any) {
    console.error('[auth/signup] fatal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error?.message || String(error)
    });
  }
}
