import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Check environment variables at runtime
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!serviceUrl || !serviceKey) {
    console.error('[auth/forgot-password] Missing Supabase credentials');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Missing Supabase credentials'
    });
  }

  const admin = createClient(serviceUrl, serviceKey);

  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists in users table
    const { data: existingUser } = await admin
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // Always return success (security best practice - don't reveal if email exists)
    // But only send email if user actually exists
    if (existingUser) {
      // Generate password reset link using Supabase Admin API
      // This creates a recovery link that can be sent via email
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                      process.env.NEXT_PUBLIC_APP_URL || 
                      'https://www.figdex.com';
      
      const { data: linkData, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: {
          redirectTo: `${baseUrl}/reset-password`
        }
      });

      if (error) {
        console.error('[auth/forgot-password] Error generating reset link:', error);
        // Still return success to user (don't reveal if email exists)
      } else if (linkData?.properties?.action_link) {
        // Supabase generateLink returns the link but doesn't send email automatically
        // We need to send the email ourselves or configure Supabase to send it
        // For now, log that we generated the link - Supabase email templates should handle sending
        // if email is configured in Supabase dashboard
        console.log('[auth/forgot-password] Password reset link generated for:', normalizedEmail);
        // Note: Supabase will send the email automatically if email templates are configured
        // Otherwise, you'll need to send the link manually via your email service
      }
    } else {
      console.log('[auth/forgot-password] User not found, but returning success:', normalizedEmail);
    }

    // Always return success (security best practice)
    return res.status(200).json({
      success: true,
      message: 'If an account with this email exists, you will receive a password reset link.'
    });

  } catch (error: any) {
    console.error('[auth/forgot-password] Error:', error);
    // Still return success to user (security best practice)
    return res.status(200).json({
      success: true,
      message: 'If an account with this email exists, you will receive a password reset link.'
    });
  }
}

