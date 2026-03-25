import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from Authorization header
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Verify the JWT token and get user ID
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      userId = user?.id;
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get files from Supabase filtered by user ID
    const { data: files, error } = await supabase
      .from('index_files')
      .select('id, project_id, figma_file_key, file_name, uploaded_at, file_size, frame_count, frame_tags, custom_tags')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Transform the data to match the expected format
    const transformedFiles = files.map(file => {
      const totalFrames = typeof file.frame_count === 'number' ? file.frame_count : 0;
      const dataSize = typeof file.file_size === 'number' ? file.file_size : 0;

      return {
        filename: file.id.toString(), // Use database ID as filename
        projectId: file.project_id,
        figmaFileKey: file.figma_file_key,
        fileName: file.file_name,
        uploadedAt: file.uploaded_at,
        size: dataSize,
        frameCount: totalFrames,
        thumbnailCount: totalFrames,
        frameTags: file.frame_tags || [],
        customTags: file.custom_tags || []
      };
    });

    res.status(200).json({
      success: true,
      files: transformedFiles
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 
