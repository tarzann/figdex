import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST'],
    });
  }

  try {
    const { jobIds } = req.body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'jobIds must be a non-empty array',
      });
    }

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Get job statuses from database
    // Also check if this is a parent job with split children - if so, check children status
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('index_jobs')
      .select('id, status, next_frame_index, total_frames, error, index_file_id, updated_at, parent_job_id, total_jobs, page_meta, selected_pages, file_key')
      .in('id', jobIds);

    if (jobsError) {
      console.error('Error fetching job statuses:', jobsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch job statuses',
        details: jobsError.message,
      });
    }

    // Map jobs by ID for easy lookup
    const jobsMap = new Map(
      (jobs || []).map((job) => [
        job.id,
        {
          status: job.status,
          nextFrameIndex: job.next_frame_index || 0,
          totalFrames: job.total_frames || 0,
          error: job.error || null,
          indexId: job.index_file_id || null,
          updatedAt: job.updated_at,
          pageMeta: job.page_meta || [],
          selectedPages: job.selected_pages || [],
          fileKey: job.file_key || null,
        },
      ])
    );

    // For jobs that might be parent jobs with split children, check children status
    const jobsWithChildren = (jobs || []).filter((j: any) => j.total_jobs && j.total_jobs > 1 && !j.parent_job_id);
    
    for (const parentJob of jobsWithChildren) {
      // Get all child jobs
      const { data: childJobs } = await supabaseAdmin
        .from('index_jobs')
        .select('id, status')
        .eq('parent_job_id', parentJob.id);
      
      if (childJobs && childJobs.length > 0) {
        const allCompleted = childJobs.every((cj: any) => cj.status === 'completed');
        const anyFailed = childJobs.some((cj: any) => cj.status === 'failed');
        
        // If all children completed, parent should be completed too
        if (allCompleted && parentJob.status !== 'completed') {
          const jobData = jobsMap.get(parentJob.id);
          if (jobData) {
            jobData.status = 'completed';
          }
        } else if (anyFailed && parentJob.status === 'processing') {
          // If any child failed, mark parent as failed
          const jobData = jobsMap.get(parentJob.id);
          if (jobData) {
            jobData.status = 'failed';
          }
        }
      }
    }
    
    // Return status for all requested job IDs (some may not exist in DB yet)
    const statuses = jobIds.map((jobId) => {
      const jobData = jobsMap.get(jobId);
      if (!jobData) {
        return {
          jobId,
          status: 'pending', // Job not found in DB yet, assume pending
          nextFrameIndex: 0,
          totalFrames: 0,
          error: null,
          indexId: null,
        };
      }

      return {
        jobId,
        status: jobData.status,
        nextFrameIndex: jobData.nextFrameIndex,
        totalFrames: jobData.totalFrames,
        error: jobData.error,
        indexId: jobData.indexId,
        updatedAt: jobData.updatedAt,
        pageMeta: jobData.pageMeta,
        selectedPages: jobData.selectedPages,
        fileKey: jobData.fileKey,
      };
    });

    return res.status(200).json({
      success: true,
      statuses,
    });
  } catch (error: any) {
    console.error('Error in get-job-status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

