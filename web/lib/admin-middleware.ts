import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

/**
 * Verify if the user making the request is an admin
 * @param req - Next.js API request
 * @returns true if admin, false otherwise
 */
export async function verifyAdmin(req: NextApiRequest): Promise<boolean> {
  try {
    // Get session from authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return false;
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    // Use service role to check user and admin status
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // If token is our API key (figdex_), verify via users table
    if (token.startsWith('figdex_')) {
      const { data: u, error: err } = await supabase
        .from('users')
        .select('is_admin, is_active, email')
        .eq('api_key', token)
        .maybeSingle();
      if (err || !u) {
        // Fallback: check admin emails (temporary solution for hardcoded admins)
        const adminEmails = ['ranmor01@gmail.com'];
        // Can't check email from API key alone, so return false
        return false;
      }
      // Check if admin in DB
      if (u.is_admin === true && (u.is_active !== false)) {
        return true;
      }
      // Fallback: check admin emails (temporary solution)
      const adminEmails = ['ranmor01@gmail.com'];
      return adminEmails.includes(u.email);
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('Admin check failed: User not found', userError);
      return false;
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (adminError) {
      console.log('Admin check failed: Database error', adminError);
      return false;
    }

    const isAdmin = adminUser?.is_admin === true;
    
    if (!isAdmin) {
      console.log('Admin check failed: User is not admin');
    }

    return isAdmin;
  } catch (error) {
    console.error('Admin verification error:', error);
    return false;
  }
}

/**
 * Wrapper for admin-only API handlers
 * Automatically checks admin status and returns 403 if not admin
 * @param handler - The API handler function
 * @returns Protected handler function
 */
export function requireAdmin(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Handle CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Verify admin status
    const isAdmin = await verifyAdmin(req);

    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required',
        message: 'This endpoint requires admin privileges'
      });
    }

    // Call the handler if admin
    return handler(req, res);
  };
}

/**
 * Get admin user info from request
 * @param req - Next.js API request
 * @returns Admin user info or null
 */
export async function getAdminUser(req: NextApiRequest) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return null;
    return user;
  } catch (error) {
    return null;
  }
}

