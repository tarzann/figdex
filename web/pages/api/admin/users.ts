import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Temporary: Skip admin check for debugging
  // TODO: Re-enable admin authentication when session management is implemented
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
      details: 'Missing Supabase credentials'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (req.method) {
      case 'GET':
        // List all users with pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search as string;
        const filterActive = req.query.active as string;

        let query = supabase
          .from('users')
          .select('*', { count: 'exact' });

        // Apply search filter
        if (search) {
          query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
        }

        // Apply active filter
        if (filterActive === 'true' || filterActive === 'false') {
          query = query.eq('is_active', filterActive === 'true');
        }

        // Apply pagination
        const { data: users, error, count } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            details: error.message
          });
        }

        return res.status(200).json({
          success: true,
          users: users || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit)
          }
        });

      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          allowedMethods: ['GET']
        });
    }
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default handler;

