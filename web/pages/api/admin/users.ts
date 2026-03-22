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

        const { data: guestRows, error: guestError } = await supabase
          .from('index_files')
          .select('owner_anon_id, uploaded_at, figma_file_key')
          .is('user_id', null)
          .not('owner_anon_id', 'is', null)
          .order('uploaded_at', { ascending: false })
          .limit(1000);

        if (guestError) {
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch guest users',
            details: guestError.message
          });
        }

        const guestMap = new Map<string, {
          id: string;
          email: string;
          full_name: string;
          api_key: string;
          plan: string;
          is_active: boolean;
          is_admin: boolean;
          is_guest: boolean;
          guest_file_count: number;
          created_at: string;
          credits_remaining: number;
        }>();

        for (const row of guestRows || []) {
          const anonId = typeof row.owner_anon_id === 'string' ? row.owner_anon_id.trim() : '';
          if (!anonId) continue;
          const existingGuest = guestMap.get(anonId);
          const uploadedAt = row.uploaded_at || new Date().toISOString();
          if (!existingGuest) {
            guestMap.set(anonId, {
              id: `guest:${anonId}`,
              email: `guest:${anonId.slice(0, 12)}`,
              full_name: `Guest (${anonId.slice(0, 8)})`,
              api_key: '',
              plan: 'guest',
              is_active: true,
              is_admin: false,
              is_guest: true,
              guest_file_count: row.figma_file_key ? 1 : 0,
              created_at: uploadedAt,
              credits_remaining: 0
            });
            continue;
          }
          if (uploadedAt < existingGuest.created_at) {
            existingGuest.created_at = uploadedAt;
          }
          if (row.figma_file_key) {
            existingGuest.guest_file_count += 1;
          }
        }

        const guestUsers = Array.from(guestMap.values()).map((guest) => ({
          ...guest,
          guest_file_count: undefined
        }));
        const combinedUsers = [...(users || []), ...guestUsers].sort((a: any, b: any) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          return bTime - aTime;
        });

        return res.status(200).json({
          success: true,
          users: combinedUsers,
          pagination: {
            page,
            limit,
            total: (count || 0) + guestUsers.length,
            totalPages: Math.ceil((((count || 0) + guestUsers.length) || 0) / limit)
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
