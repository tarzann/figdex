import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromApiKey } from '../../../lib/api-auth';
import { getPaddlePublicKey, getPaddleVendorId, getPaddlePriceId, getPaddleEnvironment, PlanId } from '../../../lib/paddle';

/**
 * GET /api/payment/get-paddle-config
 * Returns Paddle configuration for frontend
 * Includes public key, vendor ID, and price IDs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Optional: require authentication
  // const userId = await getUserIdFromApiKey(req);
  // if (!userId) {
  //   return res.status(401).json({ success: false, error: 'Unauthorized' });
  // }

  try {
    const publicKey = getPaddlePublicKey();
    const vendorId = getPaddleVendorId();
    const environment = getPaddleEnvironment();

    return res.status(200).json({
      success: true,
      config: {
        publicKey,
        vendorId: parseInt(vendorId, 10), // Paddle expects vendor ID as number
        environment,
        priceIds: {
          pro: getPaddlePriceId('pro'),
          team: getPaddlePriceId('team'),
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting Paddle config:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get Paddle configuration',
    });
  }
}

