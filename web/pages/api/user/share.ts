import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getUserIdFromApiKey } from '../../../lib/api-auth';

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

  try {
    // Get current user ID from API key
    const userId = await getUserIdFromApiKey(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (req.method === 'POST') {
      // Create share link
      const { shareType, searchParams, shareName } = req.body;

      // Validate share type
      if (!shareType || !['all_indices', 'search_results'].includes(shareType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid share type. Must be "all_indices" or "search_results"'
        });
      }

      // For search_results, searchParams is required
      if (shareType === 'search_results' && !searchParams) {
        return res.status(400).json({
          success: false,
          error: 'searchParams is required for search_results type'
        });
      }

      // Generate unique share token (12 bytes = 16 chars in base64url, still very secure)
      // Using base64url encoding for shorter, URL-safe tokens
      const shareToken = crypto.randomBytes(12).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, ''); // base64url encoding (URL-safe)

      // Create shared view
      const { data, error } = await supabase
        .from('shared_views')
        .insert({
          user_id: userId,
          share_type: shareType,
          share_token: shareToken,
          enabled: true,
          search_params: shareType === 'search_results' ? searchParams : null,
          share_name: shareName || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating shared view:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create share link',
          details: error.message
        });
      }

      const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com'}/share/${shareToken}`;

      return res.status(200).json({
        success: true,
        shareToken,
        shareUrl,
        shareType,
        enabled: true
      });

    } else if (req.method === 'GET') {
      // Get all share links for current user
      const { data, error } = await supabase
        .from('shared_views')
        .select('id, share_type, share_token, enabled, search_params, share_name, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching shared views:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch share links',
          details: error.message
        });
      }

      // Build share URLs
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com';
      const sharedViews = (data || []).map(view => ({
        ...view,
        shareUrl: `${baseUrl}/share/${view.share_token}`
      }));

      return res.status(200).json({
        success: true,
        sharedViews
      });

    } else if (req.method === 'PUT') {
      // Update share link (enable/disable, update search params, or update share name)
      const { id, enabled, searchParams, shareName } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID is required'
        });
      }

      // Verify ownership
      const { data: existingView, error: fetchError } = await supabase
        .from('shared_views')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingView || existingView.user_id !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Share link not found'
        });
      }

      // Build update object
      const updateData: any = {};
      if (enabled !== undefined) {
        updateData.enabled = enabled;
      }
      if (searchParams !== undefined) {
        updateData.search_params = searchParams;
      }
      if (shareName !== undefined) {
        updateData.share_name = shareName || null;
      }

      const { data, error } = await supabase
        .from('shared_views')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating shared view:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update share link',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        sharedView: data
      });

    } else if (req.method === 'DELETE') {
      // Delete share link
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'ID is required'
        });
      }

      // Verify ownership and delete
      const { error } = await supabase
        .from('shared_views')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting shared view:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete share link',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Share link deleted'
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

