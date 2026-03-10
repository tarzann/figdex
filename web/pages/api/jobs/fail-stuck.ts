import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Missing Supabase config' });
  }

  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  // default: mark jobs older than 30 minutes in pending/processing as failed
  // optionally, pass jobIds to force-fail specific jobs immediately
  const { minutes = 30, jobIds } = req.body || {};
  const cutoff = new Date(Date.now() - Number(minutes) * 60 * 1000).toISOString();

  const query = supabaseAdmin
    .from('index_jobs')
    .update({ status: 'failed', error: 'Marked as failed due to timeout' })
    .in('status', ['pending', 'processing']);

  if (Array.isArray(jobIds) && jobIds.length > 0) {
    query.in('id', jobIds);
  } else {
    query.lte('updated_at', cutoff);
  }

  const { data, error } = await query.select('id');

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(200).json({ success: true, failedCount: data?.length ?? 0 });
}

