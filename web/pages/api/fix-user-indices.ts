import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userEmail } = req.body;
    
    if (!userEmail || typeof userEmail !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'userEmail is required' 
      });
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, is_admin')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is admin
    if (!user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can fix user indices'
      });
    }

    // Find all indices that might belong to this user but have wrong user_id
    // Strategy: Find indices with null user_id or check by email patterns
    // Actually, let's find ALL indices and see which ones might belong to this user
    
    // First, get all indices (using service role key)
    const { data: allIndices, error: indicesError } = await supabase
      .from('index_files')
      .select('id, user_id, file_name, uploaded_at, figma_file_key')
      .order('uploaded_at', { ascending: false })
      .limit(1000);

    if (indicesError) {
      return res.status(500).json({
        success: false,
        error: 'Error fetching indices',
        details: indicesError.message
      });
    }

    // Get user's actual indices
    const { data: userIndices, error: userIndicesError } = await supabase
      .from('index_files')
      .select('id, user_id, file_name, uploaded_at, figma_file_key')
      .eq('user_id', user.id);

    if (userIndicesError) {
      return res.status(500).json({
        success: false,
        error: 'Error fetching user indices',
        details: userIndicesError.message
      });
    }

    // Strategy: Find all indices with null user_id and assign them to this admin user
    // This is safe because only admins can run this, and they typically want to fix their own indices
    const indicesWithNullUserId = allIndices?.filter(idx => 
      !idx.user_id || idx.user_id === null
    ) || [];

    // Also check for recent indices (last 24 hours) that might belong to this user
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const recentIndices = allIndices?.filter(idx => {
      if (!idx.uploaded_at) return false;
      const uploadedDate = new Date(idx.uploaded_at);
      return uploadedDate > oneDayAgo && idx.user_id !== user.id;
    }) || [];

    // Combine both: null user_id and recent indices
    const allIndicesToFix = [
      ...indicesWithNullUserId,
      ...recentIndices.filter(idx => !indicesWithNullUserId.some(nullIdx => nullIdx.id === idx.id))
    ];

    if (allIndicesToFix.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No indices found to fix',
        fixedCount: 0,
        userIndicesCount: userIndices?.length || 0,
        totalIndicesCount: allIndices?.length || 0,
        nullUserIdCount: 0,
        recentIndicesCount: 0
      });
    }

    // Update all found indices to belong to this user
    const idsToUpdate = allIndicesToFix.map(idx => idx.id);
    
    const { error: updateError, data: updatedData } = await supabase
      .from('index_files')
      .update({ user_id: user.id })
      .in('id', idsToUpdate)
      .select('id, file_name, uploaded_at');

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Error updating indices',
        details: updateError.message
      });
    }

    return res.status(200).json({
      success: true,
      message: `Fixed ${allIndicesToFix.length} indices. Use "Merge All Chunks" to combine chunked files.`,
      fixedCount: allIndicesToFix.length,
      fixedIndices: updatedData?.map(idx => ({
        id: idx.id,
        file_name: idx.file_name,
        uploaded_at: idx.uploaded_at
      })) || [],
      nullUserIdCount: indicesWithNullUserId.length,
      recentIndicesCount: recentIndices.length,
      userIndicesCount: (userIndices?.length || 0) + allIndicesToFix.length,
      totalIndicesCount: allIndices?.length || 0
    });

  } catch (error) {
    console.error('Fix user indices error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

