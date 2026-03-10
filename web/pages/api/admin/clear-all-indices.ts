import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['DELETE']
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Supabase URL or Service Key missing'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization required'
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Find user by API key
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .eq('api_key', apiKey)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    if (!user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get count before deletion
    const { count: beforeCount } = await supabase
      .from('index_files')
      .select('*', { count: 'exact', head: true });

    // Delete ALL indices
    // Get all IDs first, then delete them in batches if needed
    const { data: allIndices, error: fetchError } = await supabase
      .from('index_files')
      .select('id');

    if (fetchError) {
      console.error('Error fetching indices:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch indices for deletion',
        details: fetchError.message
      });
    }

    if (!allIndices || allIndices.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No indices to delete',
        deletedCount: 0,
        remainingCount: 0
      });
    }

    // Delete all indices by IDs (more reliable than using conditions)
    const idsToDelete = allIndices.map(idx => idx.id);
    const { error: deleteError } = await supabase
      .from('index_files')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting indices:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete indices',
        details: deleteError.message
      });
    }

    // Verify deletion
    const { count: afterCount } = await supabase
      .from('index_files')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      success: true,
      message: `Successfully deleted all indices`,
      deletedCount: beforeCount || 0,
      remainingCount: afterCount || 0
    });

  } catch (error) {
    console.error('Clear all indices error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
