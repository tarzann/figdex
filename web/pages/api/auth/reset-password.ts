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
    console.error('[auth/reset-password] Missing Supabase credentials');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Missing Supabase credentials'
    });
  }

  const admin = createClient(serviceUrl, serviceKey);

  try {
    const { password, token } = req.body || {};

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Reset token is required'
      });
    }

    // For password reset, the token should be a valid access token from Supabase
    // Try to verify the token and get the user
    let userId: string | null = null;
    let userEmail: string | null = null;
    
    try {
      // Create a client with the token to verify it
      const tempClient = createClient(serviceUrl, serviceKey);
      const { data: { user: userData }, error: verifyError } = await tempClient.auth.getUser(token);
      
      if (verifyError || !userData) {
        console.error('[auth/reset-password] Token verification error:', verifyError);
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token. Please request a new password reset link.'
        });
      }
      
      userId = userData.id;
      userEmail = userData.email || null;
    } catch (verifyErr: any) {
      console.error('[auth/reset-password] Token verification exception:', verifyErr);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset link.'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset link.'
      });
    }

    // Update the user's password using admin API
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password: password
    });

    if (updateError) {
      console.error('[auth/reset-password] Error updating password:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset password. Please try again.'
      });
    }

    console.log('[auth/reset-password] Password reset successful for user:', userEmail || userId);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });

  } catch (error: any) {
    console.error('[auth/reset-password] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while resetting your password. Please try again.'
    });
  }
}

