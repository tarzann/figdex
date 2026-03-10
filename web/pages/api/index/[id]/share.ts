import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
    if (req.method === 'POST') {
      // Make index public and generate share token
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

      return res.status(200).json({
        success: true,
        shareToken,
        shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com'}/share/${shareToken}`
      });

    } else if (req.method === 'DELETE') {
      // Make index private
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

      return res.status(200).json({
        success: true,
        message: 'Index is now private'
      });

    } else if (req.method === 'GET') {
      // Get share link if index is public
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

