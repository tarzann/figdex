import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/telemetry
 * Receives telemetry events from the FigDex plugin (fire-and-forget).
 * Accepts: eventName, timestamp, pluginVersion, userType, hasFileKey,
 * selectedPagesCount, fileKeyHash, sessionId, anonId, userId, meta.
 * Returns 200 to avoid console errors; events are logged only in development.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    if (body && typeof body.eventName === 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.log('[telemetry]', body.eventName, body.sessionId, body.anonId);
      }
    }
  } catch {
    // ignore
  }

  return res.status(200).json({ ok: true });
}
