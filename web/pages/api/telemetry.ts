import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { logIndexActivity } from '../../lib/index-activity-log';

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
      const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
      if (serviceUrl && serviceKey) {
        const supabase = createClient(serviceUrl, serviceKey);
        await logIndexActivity(supabase, {
          requestId: typeof body.sessionId === 'string' ? body.sessionId : null,
          source: 'plugin',
          eventType: `telemetry_${body.eventName}`,
          status: 'completed',
          userId: typeof body.userId === 'string' ? body.userId : null,
          ownerAnonId: typeof body.anonId === 'string' ? body.anonId : null,
          fileKey: typeof body.fileKeyHash === 'string' ? body.fileKeyHash : null,
          message: 'Plugin telemetry event',
          metadata: {
            pluginVersion: body.pluginVersion || null,
            userType: body.userType || null,
            hasFileKey: body.hasFileKey || false,
            selectedPagesCount: body.selectedPagesCount || 0,
            meta: body.meta || {},
          },
        });
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[telemetry]', body.eventName, body.sessionId, body.anonId);
      }
    }
  } catch {
    // ignore
  }

  return res.status(200).json({ ok: true });
}
