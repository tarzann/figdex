import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../../lib/admin-middleware';
import { logIndexActivity } from '../../../../../lib/index-activity-log';

async function removeStoragePrefix(
  supabaseAdmin: any,
  bucket: string,
  prefix: string
) {
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  if (!normalizedPrefix) return;

  const walk = async (pathPrefix: string) => {
    const segments = pathPrefix.split('/').filter(Boolean);
    const path = segments.slice(0, -1).join('/');
    const search = segments[segments.length - 1] || '';

    const { data, error } = await supabaseAdmin.storage.from(bucket).list(path, {
      limit: 1000,
      search,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error || !Array.isArray(data) || data.length === 0) return;

    const files: string[] = [];
    for (const item of data) {
      const itemName = typeof item?.name === 'string' ? item.name : '';
      if (!itemName) continue;
      const fullPath = [...(path ? [path] : []), itemName].join('/');
      if (item.id === null) {
        await walk(fullPath);
      } else {
        files.push(fullPath);
      }
    }

    for (let i = 0; i < files.length; i += 100) {
      const chunk = files.slice(i, i + 100);
      await supabaseAdmin.storage.from(bucket).remove(chunk);
    }
  };

  await walk(normalizedPrefix);
}

function isIgnorableDeleteError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('relation') && message.includes('does not exist')
  );
}

async function resetIndicesHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const userId = String(req.query.id || '');
    if (!userId) return res.status(400).json({ success: false, error: 'Missing user id' });

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
    }

    const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';
    const supabaseAdmin = createClient(serviceUrl, serviceKey);
    const guestPrefix = 'guest:';

    if (userId.startsWith(guestPrefix)) {
      const anonId = userId.slice(guestPrefix.length).trim();
      if (!anonId) return res.status(400).json({ success: false, error: 'Missing guest anon id' });

      const cleanupIssues: string[] = [];

      const { error: legacyErr } = await supabaseAdmin
        .from('index_files')
        .delete()
        .eq('owner_anon_id', anonId)
        .is('user_id', null);
      if (legacyErr && !isIgnorableDeleteError(legacyErr)) {
        cleanupIssues.push(`legacy indices: ${legacyErr.message}`);
      }

      const { error: normalizedErr } = await supabaseAdmin
        .from('indexed_files')
        .delete()
        .eq('owner_anon_id', anonId)
        .is('user_id', null);
      if (normalizedErr && !isIgnorableDeleteError(normalizedErr)) {
        cleanupIssues.push(`normalized indices: ${normalizedErr.message}`);
      }

      const { error: usageErr } = await supabaseAdmin
        .from('indexed_owner_usage')
        .delete()
        .eq('owner_anon_id', anonId);
      if (usageErr && !isIgnorableDeleteError(usageErr)) {
        cleanupIssues.push(`usage stats: ${usageErr.message}`);
      }

      try {
        await removeStoragePrefix(supabaseAdmin, storageBucket, `guest/${anonId}`);
        await removeStoragePrefix(supabaseAdmin, storageBucket, `index-data/guest/${anonId}`);
      } catch (storageError: any) {
        cleanupIssues.push(`storage: ${String(storageError?.message || storageError)}`);
      }

      if (cleanupIssues.length > 0) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fully reset guest indices',
          details: cleanupIssues.join(' | '),
        });
      }

      await logIndexActivity(supabaseAdmin, {
        requestId: `reset_guest_${anonId}`,
        source: 'system',
        eventType: 'reset_indices',
        status: 'completed',
        ownerAnonId: anonId,
        message: 'Guest indices reset from admin',
      });

      return res.status(200).json({ success: true, resetGuestAnonId: anonId });
    }

    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, is_admin')
      .eq('id', userId)
      .maybeSingle();
    if (userErr) return res.status(500).json({ success: false, error: userErr.message });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const cleanupIssues: string[] = [];

    const { error: legacyErr } = await supabaseAdmin.from('index_files').delete().eq('user_id', userId);
    if (legacyErr && !isIgnorableDeleteError(legacyErr)) {
      cleanupIssues.push(`legacy indices: ${legacyErr.message}`);
    }

    const { error: normalizedErr } = await supabaseAdmin.from('indexed_files').delete().eq('user_id', userId);
    if (normalizedErr && !isIgnorableDeleteError(normalizedErr)) {
      cleanupIssues.push(`normalized indices: ${normalizedErr.message}`);
    }

    const { error: usageErr } = await supabaseAdmin.from('indexed_owner_usage').delete().eq('user_id', userId);
    if (usageErr && !isIgnorableDeleteError(usageErr)) {
      cleanupIssues.push(`usage stats: ${usageErr.message}`);
    }

    try {
      await removeStoragePrefix(supabaseAdmin, storageBucket, `${userId}`);
      await removeStoragePrefix(supabaseAdmin, storageBucket, `user/${userId}`);
      await removeStoragePrefix(supabaseAdmin, storageBucket, `index-data/user/${userId}`);
    } catch (storageError: any) {
      cleanupIssues.push(`storage: ${String(storageError?.message || storageError)}`);
    }

    if (cleanupIssues.length > 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fully reset user indices',
        details: cleanupIssues.join(' | '),
      });
    }

    await logIndexActivity(supabaseAdmin, {
      requestId: `reset_user_${userId}`,
      source: 'system',
      eventType: 'reset_indices',
      status: 'completed',
      userId,
      userEmail: user.email || null,
      message: 'User indices reset from admin',
      metadata: {
        preservedPlan: user.is_admin ? 'unlimited' : (user.plan || 'free'),
      },
    });

    return res.status(200).json({
      success: true,
      resetUserId: userId,
      preservedPlan: user.is_admin ? 'unlimited' : (user.plan || 'free'),
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Internal server error', details: e?.message });
  }
}

export default requireAdmin(resetIndicesHandler);
