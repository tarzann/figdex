import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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

  try {
    const { indexId } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization header missing or invalid' });
    }

    const apiKey = authHeader.substring(7);

    if (!indexId) {
      return res.status(400).json({ success: false, error: 'indexId is required' });
    }

    // Use service role to bypass RLS (anon client cannot read users table with RLS)
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Verify user by API key
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    // Check if the index belongs to this user
    const { data: indexFile, error: indexError } = await supabaseAdmin
      .from('index_files')
      .select('*')
      .eq('id', indexId)
      .eq('user_id', user.id)
      .single();

    if (indexError || !indexFile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Index not found or you do not have permission to delete it' 
      });
    }

    // Delete the index
    const { error: deleteError } = await supabaseAdmin
      .from('index_files')
      .delete()
      .eq('id', indexId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting index:', deleteError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to delete index',
        details: deleteError.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Index deleted successfully',
      deletedIndex: {
        id: indexFile.id,
        file_name: indexFile.file_name
      }
    });

  } catch (error) {
    console.error('Error in delete-index:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}


