import type { NextApiRequest, NextApiResponse } from 'next';
import { createIndexSession, getUserFromApiKeyOrThrow } from '../../../lib/index-session-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { supabaseAdmin, user } = await getUserFromApiKeyOrThrow(req.headers.authorization);
    const {
      fileKey,
      projectId,
      fileName,
      source,
      selectedPages,
      selectedPageIds,
      metadata,
      pageJobs,
    } = req.body || {};

    if (!fileKey || typeof fileKey !== 'string') {
      return res.status(400).json({ success: false, error: 'fileKey is required' });
    }
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }
    if (!Array.isArray(pageJobs) || pageJobs.length === 0) {
      return res.status(400).json({ success: false, error: 'pageJobs must be a non-empty array' });
    }

    const session = await createIndexSession(supabaseAdmin, {
      userId: user.id,
      fileKey,
      projectId: typeof projectId === 'string' ? projectId : null,
      fileName,
      source: source === 'api' ? 'api' : 'plugin',
      selectedPages: Array.isArray(selectedPages) ? selectedPages : [],
      selectedPageIds: Array.isArray(selectedPageIds) ? selectedPageIds : [],
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      pageJobs: pageJobs.map((page: any, index: number) => ({
        pageId: String(page?.pageId || page?.id || '').trim(),
        pageName: String(page?.pageName || page?.name || '').trim() || `Page ${index + 1}`,
        sortOrder: Number.isFinite(page?.sortOrder) ? page.sortOrder : index,
        totalFrames: Number.isFinite(page?.totalFrames) ? page.totalFrames : 0,
        chunkCount: Number.isFinite(page?.chunkCount) ? page.chunkCount : 0,
        metadata: page?.metadata && typeof page.metadata === 'object' ? page.metadata : {},
      })).filter((page: any) => page.pageId),
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      session,
    });
  } catch (error: any) {
    const message = error?.message || 'Internal server error';
    const status = /api key/i.test(message) ? 401 : 500;
    return res.status(status).json({ success: false, error: message });
  }
}
