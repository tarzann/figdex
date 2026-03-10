import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Verify admin access (should check auth in production)
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Get all jobs with user info
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('index_jobs')
      .select(`
        *,
        users:user_id (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1000); // Limit to last 1000 jobs

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch jobs',
        details: jobsError.message 
      });
    }

    // Calculate processing time for each job
    const jobsWithMetrics = (jobs || []).map((job: any) => {
      const createdAt = new Date(job.created_at);
      const updatedAt = new Date(job.updated_at);
      const processingTime = updatedAt.getTime() - createdAt.getTime();
      
      // Calculate progress percentage
      const progress = job.total_frames > 0 
        ? Math.round((job.next_frame_index / job.total_frames) * 100)
        : 0;

      return {
        id: job.id,
        userId: job.user_id,
        userEmail: job.users?.email || 'Unknown',
        userName: job.users?.full_name || 'Unknown',
        fileKey: job.file_key,
        fileName: job.file_name,
        status: job.status,
        nextFrameIndex: job.next_frame_index || 0,
        totalFrames: job.total_frames || 0,
        progress,
        indexFileId: job.index_file_id,
        error: job.error,
        parentJobId: job.parent_job_id,
        jobIndex: job.job_index || 0,
        totalJobs: job.total_jobs || 1,
        figmaVersion: job.figma_version,
        figmaLastModified: job.figma_last_modified,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        processingTimeMs: processingTime,
        processingTimeSeconds: Math.round(processingTime / 1000),
        processingTimeMinutes: Math.round(processingTime / 60000),
        selectedPages: job.selected_pages || [],
        selectedPageIds: job.selected_page_ids || [],
      };
    });

    return res.status(200).json({
      success: true,
      jobs: jobsWithMetrics,
      total: jobsWithMetrics.length,
    });

  } catch (error: any) {
    console.error('Error in admin/jobs:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

