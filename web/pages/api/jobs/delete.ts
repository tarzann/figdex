import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Missing Supabase config' });
  }

  const { jobId, indexId, deleteIndex = false } = req.body || {};
  console.log('🗑️ Delete job request:', { jobId, indexId, deleteIndex });
  
  if (!jobId && !indexId) {
    return res.status(400).json({ success: false, error: 'jobId or indexId is required' });
  }

  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  // Fetch job to get index_file_id (may be missing - that's OK)
  let job: any = null;
  let indexFileId: string | null = null;
  if (jobId) {
    const { data: jobData } = await supabaseAdmin
      .from('index_jobs')
      .select('id, index_file_id')
      .eq('id', jobId)
      .maybeSingle();
    job = jobData || null;
    indexFileId = job?.index_file_id || null;
  }

  // Delete job (if it exists - don't fail if it doesn't)
  if (jobId) {
    await supabaseAdmin
      .from('index_jobs')
      .delete()
      .eq('id', jobId);
    // Don't check for errors - job may already be deleted
  }

  // Delete from saved_indices (persisted list) by job_id or index id (OR, not AND)
  // This is the most important part - we want to remove it from the UI even if job is gone
  let deletedFromSavedIndices = false;
  if (indexId || jobId) {
    // Try deleting by indexId first (most reliable)
    if (indexId) {
      const { error: delByIdErr } = await supabaseAdmin
        .from('saved_indices')
        .delete()
        .eq('id', indexId);
      
      if (!delByIdErr) {
        deletedFromSavedIndices = true;
        console.log('✅ Deleted from saved_indices by id:', indexId);
      } else {
        console.error('Error deleting from saved_indices by id:', delByIdErr);
      }
    }
    
    // Also try by job_id if we have it and haven't deleted yet
    if (jobId && !deletedFromSavedIndices) {
      const { error: delByJobIdErr } = await supabaseAdmin
        .from('saved_indices')
        .delete()
        .eq('job_id', jobId);
      
      if (!delByJobIdErr) {
        deletedFromSavedIndices = true;
        console.log('✅ Deleted from saved_indices by job_id:', jobId);
      } else {
        console.error('Error deleting from saved_indices by job_id:', delByJobIdErr);
      }
    }
  }

  // Optionally delete associated index file
  if (deleteIndex && indexFileId) {
    await supabaseAdmin
      .from('index_files')
      .delete()
      .eq('id', indexFileId);
    // Don't check for errors - index may already be deleted
  }

  // Always return success - we've done our best to clean up
  return res.status(200).json({ success: true });
}

