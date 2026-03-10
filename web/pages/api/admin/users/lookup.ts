import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserCredits } from '../../../../lib/credits';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Check admin authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Verify admin user
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, email, is_admin')
      .eq('api_key', apiKey)
      .single();

    if (adminError || !adminUser || !adminUser.is_admin) {
      // Fallback: check admin emails (temporary solution)
      const adminEmails = ['ranmor01@gmail.com'];
      if (!adminUser || !adminEmails.includes(adminUser.email)) {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }
    }

    // Get email from query parameter
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter is required' });
    }

    // Find user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found',
        email: email 
      });
    }

    // Get user's credits info
    const creditsInfo = await getUserCredits(supabaseAdmin, user.id);

    // Get user's indices count
    const { count: indicesCount } = await supabaseAdmin
      .from('index_files')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get recent jobs
    const { data: recentJobs, error: jobsError } = await supabaseAdmin
      .from('index_jobs')
      .select('id, file_name, status, created_at, updated_at, total_frames, next_frame_index')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get auth user info (if exists in auth.users)
    let authUserInfo = null;
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.id);
      if (!authError && authData?.user) {
        authUserInfo = {
          email_confirmed_at: authData.user.email_confirmed_at,
          last_sign_in_at: authData.user.last_sign_in_at,
          created_at: authData.user.created_at,
          phone: authData.user.phone,
          confirmed_at: authData.user.confirmed_at,
        };
      }
    } catch (e) {
      console.log('Could not fetch auth user info:', e);
    }

    // Format response
    const response = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        plan: user.plan,
        is_admin: user.is_admin,
        is_active: user.is_active,
        api_key: user.api_key ? `${user.api_key.slice(0, 8)}••••••••` : null,
        credits_remaining: user.credits_remaining || 0,
        credits_reset_date: user.credits_reset_date,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
        provider: (user as any).provider,
      },
      credits: creditsInfo.credits || null,
      stats: {
        indices_count: indicesCount || 0,
        recent_jobs_count: recentJobs?.length || 0,
      },
      recent_jobs: recentJobs || [],
      auth_info: authUserInfo,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in /api/admin/users/lookup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

