import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      error: 'User ID is required'
    });
  }

  const PROTECTED_EMAILS = ['ranmor01@gmail.com', 'ranmor@gmail.com'];

  try {
    switch (req.method) {
      case 'GET':
        // Get single user with their indices
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (userError) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        // Get user's indices
        const { data: indices, error: indicesError } = await supabase
          .from('index_files')
          .select('*')
          .eq('user_id', id)
          .order('uploaded_at', { ascending: false })
          .limit(100);

        return res.status(200).json({
          success: true,
          user: user,
          indices: indices || [],
          indicesError: indicesError?.message
        });

      case 'PUT':
        // Update user - block for protected admins
        const { data: userForPut } = await supabase.from('users').select('email').eq('id', id).maybeSingle();
        if (userForPut && PROTECTED_EMAILS.includes((userForPut.email || '').toLowerCase())) {
          return res.status(403).json({ success: false, error: 'Cannot modify protected admin user' });
        }
        const { full_name, company, is_active, is_admin } = req.body;
        
        const updates: any = {};
        if (full_name !== undefined) updates.full_name = full_name;
        if (company !== undefined) updates.company = company;
        if (is_active !== undefined) updates.is_active = is_active;
        if (is_admin !== undefined) updates.is_admin = is_admin;

        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return res.status(500).json({
            success: false,
            error: 'Failed to update user',
            details: error.message
          });
        }

        return res.status(200).json({
          success: true,
          user: data
        });

      case 'DELETE':
        // Soft delete user (set is_active = false) - block for protected admins
        const { data: userForDel } = await supabase.from('users').select('email').eq('id', id).maybeSingle();
        if (userForDel && PROTECTED_EMAILS.includes((userForDel.email || '').toLowerCase())) {
          return res.status(403).json({ success: false, error: 'Cannot delete protected admin user' });
        }
        const { error: deleteError } = await supabase
          .from('users')
          .update({ is_active: false })
          .eq('id', id);

        if (deleteError) {
          return res.status(500).json({
            success: false,
            error: 'Failed to delete user',
            details: deleteError.message
          });
        }

        return res.status(200).json({
          success: true,
          message: 'User deactivated successfully'
        });

      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          allowedMethods: ['GET', 'PUT', 'DELETE']
        });
    }
  } catch (error) {
    console.error('User API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default handler;

