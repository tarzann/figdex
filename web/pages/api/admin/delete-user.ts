import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
    }
    const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';
    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Find user
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, provider_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (userErr) return res.status(500).json({ success: false, error: userErr.message });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Delete DB data (indices first)
    const { error: idxErr } = await supabaseAdmin.from('index_files').delete().eq('user_id', user.id);
    if (idxErr) return res.status(500).json({ success: false, error: `Failed to delete index_files: ${idxErr.message}` });

    // Best-effort: delete storage under <userId>/** recursively
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
      await removeAllUnder(`${user.id}`);
    } catch {}

    // Delete user row
    const { error: delUserErr } = await supabaseAdmin.from('users').delete().eq('id', user.id);
    if (delUserErr) return res.status(500).json({ success: false, error: `Failed to delete user: ${delUserErr.message}` });

    // Best-effort: delete Supabase Auth user (if exists)
    try {
      // Try using provider_id when it looks like a UUID
      const candidateId = (user as any).provider_id as string | undefined;
      if (candidateId && /^[0-9a-f-]{36}$/i.test(candidateId)) {
        await (supabaseAdmin as any).auth.admin.deleteUser(candidateId);
      } else {
        // Fallback: list users and delete by email
        const { data: listed } = await (supabaseAdmin as any).auth.admin.listUsers();
        const match = listed?.users?.find((u: any) => String(u.email).toLowerCase() === String(email).toLowerCase());
        if (match?.id) {
          await (supabaseAdmin as any).auth.admin.deleteUser(match.id);
        }
      }
    } catch {}

    return res.status(200).json({ success: true, deletedUserId: user.id });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Internal server error', details: e?.message });
  }
}


