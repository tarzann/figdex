import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../../lib/admin-middleware';

async function purgeHandler(req: NextApiRequest, res: NextApiResponse) {
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

      const { error: guestIdxErr } = await supabaseAdmin
        .from('index_files')
        .delete()
        .eq('owner_anon_id', anonId)
        .is('user_id', null);

      if (guestIdxErr) {
        return res.status(500).json({ success: false, error: `Failed to delete guest index_files: ${guestIdxErr.message}` });
      }

      return res.status(200).json({ success: true, deletedGuestAnonId: anonId });
    }

    // Verify user exists and is not protected admin
    const PROTECTED_EMAILS = ['ranmor01@gmail.com', 'ranmor@gmail.com'];
    const { data: user, error: userErr } = await supabaseAdmin.from('users').select('id, email').eq('id', userId).maybeSingle();
    if (userErr) return res.status(500).json({ success: false, error: userErr.message });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (PROTECTED_EMAILS.includes((user.email || '').toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Cannot delete protected admin user' });
    }
    // Delete indices
    const { error: idxErr } = await supabaseAdmin.from('index_files').delete().eq('user_id', userId);
    if (idxErr) return res.status(500).json({ success: false, error: `Failed to delete index_files: ${idxErr.message}` });
    // Delete storage under userId/**
    try {
      const list = async (prefix: string) => {
        const { data } = await (supabaseAdmin as any).storage.from(storageBucket).list(prefix, { limit: 1000 });
        return data || [];
      };
      const removeAllUnder = async (prefix: string) => {
        const years = await list(prefix);
        for (const y of years) {
          const months = await list(`${prefix}/${y.name}`);
          for (const m of months) {
            const days = await list(`${prefix}/${y.name}/${m.name}`);
            for (const d of days) {
              const files = await list(`${prefix}/${y.name}/${m.name}/${d.name}`);
              if (files.length > 0) {
                const paths = files.map((f: any) => `${prefix}/${y.name}/${m.name}/${d.name}/${f.name}`);
                await (supabaseAdmin as any).storage.from(storageBucket).remove(paths);
              }
            }
          }
        }
      };
      await removeAllUnder(`${userId}`);
    } catch {}
    // Delete user row
    const { error: delUserErr } = await supabaseAdmin.from('users').delete().eq('id', userId);
    if (delUserErr) return res.status(500).json({ success: false, error: `Failed to delete user: ${delUserErr.message}` });
    return res.status(200).json({ success: true, deletedUserId: userId });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Internal server error', details: e?.message });
  }
}

export default requireAdmin(purgeHandler);

