import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

/**
 * Debug endpoint to check if tags are saved in database
 * GET /api/debug-tags?fileKey=xxx
 */
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

    // Get API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
      return res.status(400).json({ success: false, error: 'Invalid API key format' });
    }

    // Find user by API key
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('api_key', apiKey)
      .single();

    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    const { fileKey } = req.query;
    if (!fileKey || typeof fileKey !== 'string') {
      return res.status(400).json({ success: false, error: 'fileKey query parameter required' });
    }

    // Get index file with tags
    const { data: indexFile, error: indexError } = await supabaseAdmin
      .from('index_files')
      .select('id, file_name, figma_file_key, frame_tags, custom_tags, uploaded_at')
      .eq('user_id', user.id)
      .eq('figma_file_key', fileKey)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (indexError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch index',
        details: indexError.message
      });
    }

    if (!indexFile) {
      return res.status(404).json({
        success: false,
        error: 'Index not found',
        fileKey
      });
    }

    return res.status(200).json({
      success: true,
      index: {
        id: indexFile.id,
        fileName: indexFile.file_name,
        fileKey: indexFile.figma_file_key,
        frameTags: indexFile.frame_tags || [],
        customTags: indexFile.custom_tags || [],
        uploadedAt: indexFile.uploaded_at,
        frameTagsType: typeof indexFile.frame_tags,
        customTagsType: typeof indexFile.custom_tags,
        frameTagsIsArray: Array.isArray(indexFile.frame_tags),
        customTagsIsArray: Array.isArray(indexFile.custom_tags)
      }
    });
  } catch (error: any) {
    console.error('Error in debug-tags:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error?.message
    });
  }
}



