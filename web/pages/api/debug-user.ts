import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userEmail } = req.method === 'GET' ? req.query : req.body;
    
    if (!userEmail || typeof userEmail !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'userEmail is required' 
      });
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, api_key, is_admin, created_at')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        details: userError?.message
      });
    }

    // Get all indices for this user
    const { data: userIndices, error: indicesError } = await supabase
      .from('index_files')
      .select('id, user_id, file_name, figma_file_key, project_id, uploaded_at')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    // Get all indices with null user_id
    const { data: nullUserIdIndices, error: nullIndicesError } = await supabase
      .from('index_files')
      .select('id, user_id, file_name, figma_file_key, project_id, uploaded_at')
      .is('user_id', null)
      .order('uploaded_at', { ascending: false })
      .limit(20);

    // Get recent indices (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const { data: recentIndices, error: recentIndicesError } = await supabase
      .from('index_files')
      .select('id, user_id, file_name, figma_file_key, project_id, uploaded_at')
      .gte('uploaded_at', oneDayAgo.toISOString())
      .order('uploaded_at', { ascending: false })
      .limit(20);

    // Get indices that might belong to this user (check by fileKey patterns or recent uploads)
    const { data: allRecentIndices } = await supabase
      .from('index_files')
      .select('id, user_id, file_name, figma_file_key, project_id, uploaded_at, created_at')
      .gte('uploaded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('uploaded_at', { ascending: false })
      .limit(50);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_admin: user.is_admin,
        has_api_key: !!user.api_key,
        api_key_prefix: user.api_key ? user.api_key.substring(0, 15) + '...' : null,
        created_at: user.created_at
      },
      indices: {
        userIndices: userIndices || [],
        userIndicesCount: userIndices?.length || 0,
        nullUserIdIndices: nullUserIdIndices || [],
        nullUserIdCount: nullUserIdIndices?.length || 0,
        recentIndices: recentIndices || [],
        recentIndicesCount: recentIndices?.length || 0,
        allRecentIndices: allRecentIndices || []
      },
      recommendations: {
        hasUserIndices: (userIndices?.length || 0) > 0,
        hasNullUserIdIndices: (nullUserIdIndices?.length || 0) > 0,
        shouldFix: (nullUserIdIndices?.length || 0) > 0 || ((userIndices?.length || 0) === 0 && (recentIndices?.length || 0) > 0)
      }
    });

  } catch (error) {
    console.error('Debug user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


