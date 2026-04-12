import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { logIndexActivity } from '../../lib/index-activity-log';
import { removeNormalizedIndexedPages } from '../../lib/normalized-index-store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resolveUserFromBearerToken(token: string) {
  if (!token) return null;

  if (token.startsWith('figdex_') && token.length >= 20) {
    const { data } = await supabase
      .from('users')
      .select('id, email, is_active')
      .eq('api_key', token)
      .maybeSingle();
    return data && data.is_active ? data : null;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user?.id) return null;

  const { data } = await supabase
    .from('users')
    .select('id, email, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();
  return data && data.is_active ? data : null;
}

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
    const fileKey = typeof req.body?.fileKey === 'string' ? req.body.fileKey.trim() : '';
    const anonId = typeof req.body?.anonId === 'string' ? req.body.anonId.trim() : '';
    const pageIds = Array.isArray(req.body?.pageIds)
      ? req.body.pageIds.map((pageId: unknown) => String(pageId || '').trim()).filter(Boolean)
      : [];

    if (!fileKey) {
      return res.status(400).json({ success: false, error: 'fileKey is required' });
    }

    if (pageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'pageIds is required' });
    }

    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    let owner:
      | { type: 'user'; userId: string; email?: string | null }
      | { type: 'guest'; anonId: string }
      | null = null;

    if (bearerToken) {
      const user = await resolveUserFromBearerToken(bearerToken);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid account token' });
      }
      owner = { type: 'user', userId: user.id, email: user.email || null };
    } else if (anonId) {
      owner = { type: 'guest', anonId };
    }

    if (!owner) {
      return res.status(400).json({ success: false, error: 'Authorization or anonId is required' });
    }

    const removal = await removeNormalizedIndexedPages(supabase, {
      owner: owner.type === 'user'
        ? { type: 'user', userId: owner.userId }
        : { type: 'guest', anonId: owner.anonId },
      fileKey,
      pageIds,
    });

    await logIndexActivity(supabase, {
      requestId: `remove_indexed_pages_${Date.now()}`,
      source: 'plugin',
      eventType: 'index_pages_removed',
      status: 'completed',
      userId: owner.type === 'user' ? owner.userId : null,
      ownerAnonId: owner.type === 'guest' ? owner.anonId : null,
      userEmail: owner.type === 'user' ? owner.email || null : null,
      fileKey,
      logicalFileId: fileKey,
      pageCount: removal.removedPagesCount,
      frameCount: removal.removedFramesCount,
      message: removal.removedPagesCount > 0
        ? 'Indexed pages removed from file'
        : 'Remove indexed pages requested but nothing matched',
      metadata: {
        requestedPageIds: pageIds,
        removedPageIds: removal.removedPageIds,
        fileDeleted: removal.fileDeleted,
      },
    });

    return res.status(200).json({
      success: true,
      removedPageIds: removal.removedPageIds,
      removedPagesCount: removal.removedPagesCount,
      removedFramesCount: removal.removedFramesCount,
      fileDeleted: removal.fileDeleted,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
    });
  }
}
