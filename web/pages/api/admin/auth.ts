import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '../../../lib/admin-middleware';

/**
 * API endpoint to check if current user is an admin
 * GET /api/admin/auth
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS
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
    const isAdmin = await verifyAdmin(req);
    
    return res.status(200).json({
      success: true,
      isAdmin: isAdmin,
      message: isAdmin ? 'User is an admin' : 'User is not an admin'
    });
  } catch (error) {
    console.error('Admin auth check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


