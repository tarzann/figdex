import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getIndexSessionAggregate,
  getUserFromApiKeyOrThrow,
  requestIndexSessionCancel,
} from '../../../lib/index-session-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sessionId = String(req.query.id || '').trim();
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session id is required' });
  }
  const requestStartedAt = Date.now();

  try {
    const { supabaseAdmin, user } = await getUserFromApiKeyOrThrow(req.headers.authorization);

    if (req.method === 'GET') {
      const session = await getIndexSessionAggregate(supabaseAdmin, sessionId, user.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      const durationMs = Date.now() - requestStartedAt;
      console.log('[index-session-status]', {
        sessionId,
        userId: user.id,
        status: session.status,
        totalPages: session.total_pages,
        completedPages: session.completed_pages,
        failedPages: session.failed_pages,
        processedFrames: session.processed_frames,
        totalFrames: session.total_frames,
        durationMs,
      });
      res.setHeader('X-FigDex-Session-Id', sessionId);
      res.setHeader('X-FigDex-Session-Status', session.status);
      res.setHeader('X-FigDex-Session-Completed-Pages', String(session.completed_pages || 0));
      res.setHeader('X-FigDex-Session-Total-Pages', String(session.total_pages || 0));
      res.setHeader('X-FigDex-Session-Duration-Ms', String(durationMs));
      return res.status(200).json({ success: true, session });
    }

    if (req.method === 'POST') {
      const action = String(req.body?.action || '').trim().toLowerCase();
      if (action !== 'cancel') {
        return res.status(400).json({ success: false, error: 'Unsupported action' });
      }

      const session = await requestIndexSessionCancel(supabaseAdmin, sessionId, user.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const aggregate = await getIndexSessionAggregate(supabaseAdmin, sessionId, user.id);
      return res.status(200).json({ success: true, session: aggregate || session });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    const message = error?.message || 'Internal server error';
    const status = /api key/i.test(message) ? 401 : 500;
    return res.status(status).json({ success: false, error: message });
  }
}
