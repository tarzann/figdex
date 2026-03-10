import type { NextApiRequest, NextApiResponse } from 'next';
import { get } from '../../../lib/plugin-connect-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const nonce = typeof req.query.nonce === 'string' ? req.query.nonce : null;
  if (!nonce || nonce.length < 8) {
    return res.status(200).json({ ready: false });
  }
  const entry = get(nonce);
  if (!entry) {
    return res.status(200).json({ ready: false });
  }
  return res.status(200).json({
    ready: true,
    token: entry.token,
    userId: entry.userId,
  });
}
