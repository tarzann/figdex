import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromApiKey } from '../../../lib/api-auth';

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

  // Get user ID from API key
  const userId = await getUserIdFromApiKey(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Please provide a valid API key.' });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Missing Supabase config' });
  }

  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  try {
    // Find all jobs that are not completed for this user
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('index_jobs')
      .select('id, index_file_id')
      .neq('status', 'completed')
      .eq('user_id', userId);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
    }

    if (!jobs || jobs.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No jobs to clean up',
        deleted: { jobs: 0, savedIndices: 0 }
      });
    }

    const jobIds = jobs.map(j => j.id);
    const savedIndexIds: string[] = [];

    // Get saved_indices entries for these jobs
    const { data: savedIndices } = await supabaseAdmin
      .from('saved_indices')
      .select('id, job_id')
      .in('job_id', jobIds)
      .eq('user_id', userId);

    if (savedIndices) {
      savedIndexIds.push(...savedIndices.map(si => si.id));
    }

    // Delete jobs
    const { error: deleteJobsError } = await supabaseAdmin
      .from('index_jobs')
      .delete()
      .in('id', jobIds);

    if (deleteJobsError) {
      console.error('Error deleting jobs:', deleteJobsError);
    }

    // Delete from saved_indices
    let deletedSavedIndices = 0;
    if (savedIndexIds.length > 0) {
      const { error: deleteSavedError } = await supabaseAdmin
        .from('saved_indices')
        .delete()
        .in('id', savedIndexIds);

      if (deleteSavedError) {
        console.error('Error deleting saved_indices:', deleteSavedError);
      } else {
        deletedSavedIndices = savedIndexIds.length;
      }
    }

    // Optionally delete index files (if requested)
    const { deleteIndexFiles = false } = req.body || {};
    if (deleteIndexFiles) {
      const indexFileIds = jobs
        .map(j => j.index_file_id)
        .filter((id): id is string => !!id);
      
      if (indexFileIds.length > 0) {
        await supabaseAdmin
          .from('index_files')
          .delete()
          .in('id', indexFileIds)
          .eq('user_id', userId);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Cleaned up ${jobIds.length} jobs`,
      deleted: {
        jobs: jobIds.length,
        savedIndices: deletedSavedIndices,
        indexFiles: deleteIndexFiles ? jobs.filter(j => j.index_file_id).length : 0
      }
    });

  } catch (error: any) {
    console.error('Error in cleanup:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

