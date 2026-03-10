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
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['GET']
    });
  }

  try {
    // Get the latest index
    const { data: latestIndex, error: indexError } = await supabase
      .from('index_files')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (indexError) {
      return res.status(500).json({
        success: false,
        error: 'Error fetching latest index',
        details: indexError.message
      });
    }

    if (!latestIndex) {
      return res.status(404).json({
        success: false,
        error: 'No indices found'
      });
    }

    // Check if tags columns exist
    const hasFrameTags = 'frame_tags' in latestIndex;
    const hasCustomTags = 'custom_tags' in latestIndex;

    // Get a sample frame to check for tags
    let sampleFrame = null;
    if (latestIndex.index_data && Array.isArray(latestIndex.index_data)) {
      const firstPage = latestIndex.index_data[0];
      if (firstPage && firstPage.frames && Array.isArray(firstPage.frames)) {
        sampleFrame = firstPage.frames[0];
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        latestIndex: {
          id: latestIndex.id,
          file_name: latestIndex.file_name,
          uploaded_at: latestIndex.uploaded_at,
          hasFrameTags,
          hasCustomTags,
          frameTagsValue: latestIndex.frame_tags,
          customTagsValue: latestIndex.custom_tags
        },
        sampleFrame: sampleFrame ? {
          id: sampleFrame.id,
          name: sampleFrame.name,
          hasFrameTags: 'frameTags' in sampleFrame,
          hasTags: 'tags' in sampleFrame,
          frameTags: sampleFrame.frameTags,
          tags: sampleFrame.tags,
          allKeys: Object.keys(sampleFrame)
        } : null,
        indexDataStructure: latestIndex.index_data ? {
          isArray: Array.isArray(latestIndex.index_data),
          length: Array.isArray(latestIndex.index_data) ? latestIndex.index_data.length : 'not array',
          firstItemKeys: latestIndex.index_data && latestIndex.index_data[0] ? Object.keys(latestIndex.index_data[0]) : null
        } : null
      }
    });

  } catch (error) {
    console.error('Debug DB error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}




