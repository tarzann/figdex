import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../../lib/admin-middleware';

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

      const { error: legacyErr } = await supabaseAdmin
        .from('index_files')
        .delete()
        .eq('owner_anon_id', anonId)
        .is('user_id', null);
      if (legacyErr) return res.status(500).json({ success: false, error: `Failed to reset guest index_files: ${legacyErr.message}` });

      const { error: normalizedErr } = await supabaseAdmin
        .from('indexed_files')
        .delete()
        .eq('owner_anon_id', anonId)
        .is('user_id', null);
      if (normalizedErr) return res.status(500).json({ success: false, error: `Failed to reset guest normalized indices: ${normalizedErr.message}` });

      await supabaseAdmin
        .from('indexed_owner_usage')
        .delete()
        .eq('owner_anon_id', anonId);

      try {
        await removeStoragePrefix(supabaseAdmin, storageBucket, `guest/${anonId}`);
        await removeStoragePrefix(supabaseAdmin, storageBucket, `index-data/guest/${anonId}`);
      } catch {}

      return res.status(200).json({ success: true, resetGuestAnonId: anonId });
    }

    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, is_admin')
      .eq('id', userId)
      .maybeSingle();
    if (userErr) return res.status(500).json({ success: false, error: userErr.message });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const { error: legacyErr } = await supabaseAdmin.from('index_files').delete().eq('user_id', userId);
    if (legacyErr) return res.status(500).json({ success: false, error: `Failed to reset index_files: ${legacyErr.message}` });

    const { error: normalizedErr } = await supabaseAdmin.from('indexed_files').delete().eq('user_id', userId);
    if (normalizedErr) return res.status(500).json({ success: false, error: `Failed to reset normalized indices: ${normalizedErr.message}` });

    await supabaseAdmin.from('indexed_owner_usage').delete().eq('user_id', userId);

    try {
      await removeStoragePrefix(supabaseAdmin, storageBucket, `${userId}`);
      await removeStoragePrefix(supabaseAdmin, storageBucket, `user/${userId}`);
      await removeStoragePrefix(supabaseAdmin, storageBucket, `index-data/user/${userId}`);
    } catch {}

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
