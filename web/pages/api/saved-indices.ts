import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromApiKey } from '../../lib/api-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Get user ID from API key
  const userId = await getUserIdFromApiKey(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please provide a valid API key.' });
  }

  try {
    // GET - Get all saved indices for user
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('saved_indices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved indices:', error);
        return res.status(500).json({ error: 'Failed to fetch saved indices' });
      }

      // Transform to match frontend interface
      const indices = (data || []).map((idx: any) => ({
        id: idx.id,
        jobId: idx.job_id,
        fileKey: idx.file_key,
        fileName: idx.file_name,
        selectedPages: idx.selected_pages || [],
        status: idx.status,
        createdAt: idx.created_at,
        completedAt: idx.completed_at,
        totalFrames: idx.total_frames,
        currentFrameIndex: idx.current_frame_index,
        indexId: idx.index_id,
        error: idx.error,
      }));

      return res.status(200).json({ success: true, indices });
    }

    // POST - Save a new index
    if (req.method === 'POST') {
      const {
        jobId,
        fileKey,
        fileName,
        selectedPages,
        status,
        totalFrames,
        currentFrameIndex,
        indexId,
        error: errorMessage,
      } = req.body;

      if (!jobId || !fileKey || !fileName || !status) {
        return res.status(400).json({ error: 'jobId, fileKey, fileName, and status are required' });
      }

      const { data, error } = await supabase
        .from('saved_indices')
        .insert([
          {
            user_id: userId,
            job_id: jobId,
            file_key: fileKey,
            file_name: fileName,
            selected_pages: selectedPages || [],
            status,
            total_frames: totalFrames,
            current_frame_index: currentFrameIndex || 0,
            index_id: indexId,
            error: errorMessage,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving index:', error);
        return res.status(500).json({ error: 'Failed to save index' });
      }

      // Transform to match frontend interface
      const index = {
        id: data.id,
        jobId: data.job_id,
        fileKey: data.file_key,
        fileName: data.file_name,
        selectedPages: data.selected_pages || [],
        status: data.status,
        createdAt: data.created_at,
        completedAt: data.completed_at,
        totalFrames: data.total_frames,
        currentFrameIndex: data.current_frame_index,
        indexId: data.index_id,
        error: data.error,
      };

      return res.status(200).json({ success: true, index });
    }

    // PUT - Update an existing index
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Index ID is required' });
      }

      // Verify the index belongs to the user
      const { data: existing, error: checkError } = await supabase
        .from('saved_indices')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ error: 'Index not found' });
      }

      // Build update object
      const updateData: any = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.totalFrames !== undefined) updateData.total_frames = updates.totalFrames;
      if (updates.currentFrameIndex !== undefined) updateData.current_frame_index = updates.currentFrameIndex;
      if (updates.indexId !== undefined) updateData.index_id = updates.indexId;
      if (updates.error !== undefined) updateData.error = updates.error;
      if (updates.selectedPages !== undefined) updateData.selected_pages = updates.selectedPages;
      
      // Set completed_at if status is completed
      if (updates.status === 'completed') {
        const { data: existingFull } = await supabase
          .from('saved_indices')
          .select('completed_at')
          .eq('id', id)
          .eq('user_id', userId)
          .single();
        if (!existingFull?.completed_at) {
          updateData.completed_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from('saved_indices')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating index:', error);
        return res.status(500).json({ error: 'Failed to update index' });
      }

      // Transform to match frontend interface
      const index = {
        id: data.id,
        jobId: data.job_id,
        fileKey: data.file_key,
        fileName: data.file_name,
        selectedPages: data.selected_pages || [],
        status: data.status,
        createdAt: data.created_at,
        completedAt: data.completed_at,
        totalFrames: data.total_frames,
        currentFrameIndex: data.current_frame_index,
        indexId: data.index_id,
        error: data.error,
      };

      return res.status(200).json({ success: true, index });
    }

    // DELETE - Delete an index
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Index ID is required' });
      }

      // Verify the index belongs to the user
      const { data: existing, error: checkError } = await supabase
        .from('saved_indices')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ error: 'Index not found' });
      }

      const { error } = await supabase
        .from('saved_indices')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting index:', error);
        return res.status(500).json({ error: 'Failed to delete index' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

