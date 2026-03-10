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

  const { filename } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename is required' });
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

    // Get file data from Supabase filtered by user ID and filename
    const { data: files, error } = await supabase
      .from('index_files')
      .select('*')
      .eq('user_id', userId)
      .eq('filename', filename)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({ error: 'File not found' });
    }

    if (!files) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Return the index data
    res.status(200).json({
      success: true,
      data: files.index_data
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 