import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getUserIdFromApiKey } from '../../../../lib/api-auth';
import { logIndexActivity } from '../../../../lib/index-activity-log';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Index ID is required'
    });
  }

  try {
    const userId = await getUserIdFromApiKey(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (req.method === 'POST') {
      const { data: existingIndex, error: existingError } = await supabase
        .from('index_files')
        .select('id, user_id, file_name')
        .eq('id', id)
        .single();

      if (existingError || !existingIndex || existingIndex.user_id !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Index not found'
        });
      }

      const shareToken = crypto.randomBytes(16).toString('hex');

      const { data, error } = await supabase
        .from('index_files')
        .update({
          is_public: true,
          share_token: shareToken
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to share index',
          details: error.message
        });
      }

      await logIndexActivity(supabase, {
        requestId: `legacy_share_${id}`,
        source: 'api',
        eventType: 'share_created',
        status: 'completed',
        userId,
        fileName: data.file_name || existingIndex.file_name || 'Shared index',
        message: 'Legacy index share created',
        metadata: {
          shareToken,
          indexId: id,
          shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com'}/share/${shareToken}`,
          legacy: true,
        },
      });

      return res.status(200).json({
        success: true,
        shareToken,
        shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com'}/share/${shareToken}`
      });

    } else if (req.method === 'DELETE') {
      const { data: existingIndex, error: existingError } = await supabase
        .from('index_files')
        .select('id, user_id, file_name')
        .eq('id', id)
        .single();

      if (existingError || !existingIndex || existingIndex.user_id !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Index not found'
        });
      }

      const { data, error } = await supabase
        .from('index_files')
        .update({
          is_public: false,
          share_token: null
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to unshare index',
          details: error.message
        });
      }

      await logIndexActivity(supabase, {
        requestId: `legacy_share_${id}`,
        source: 'api',
        eventType: 'share_deleted',
        status: 'completed',
        userId,
        fileName: data.file_name || existingIndex.file_name || 'Shared index',
        message: 'Legacy index share removed',
        metadata: {
          indexId: id,
          legacy: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Index is now private'
      });

    } else if (req.method === 'GET') {
      const { data: existingIndex, error: existingError } = await supabase
        .from('index_files')
        .select('id, user_id, is_public, share_token')
        .eq('id', id)
        .single();

      if (existingError || !existingIndex || existingIndex.user_id !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Index not found'
        });
      }

      const { data, error } = await supabase
        .from('index_files')
        .select('is_public, share_token')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch index',
          details: error.message
        });
      }

      if (!data.is_public || !data.share_token) {
        return res.status(200).json({
          success: true,
          isPublic: false
        });
      }

      return res.status(200).json({
        success: true,
        isPublic: true,
        shareToken: data.share_token,
        shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com'}/share/${data.share_token}`
      });

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Share API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
