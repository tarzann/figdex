import type { NextApiRequest, NextApiResponse } from 'next';
import { APP_VERSION, APP_NAME, BUILD_TIMESTAMP } from '../../lib/version';

export const config = { api: { bodyParser: false } };

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') return res.status(200).end();
  if (_req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  return res.status(200).json({
    success: true,
    name: APP_NAME,
    version: APP_VERSION,
    build: BUILD_TIMESTAMP,
  });
}


