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
    const { jobId, indexId } = req.query;

    if (!jobId && !indexId) {
      return res.status(400).json({ 
        success: false, 
        error: 'jobId or indexId is required' 
      });
    }

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Get job details
    let job = null;
    if (jobId) {
      const { data: jobData, error: jobError } = await supabaseAdmin
        .from('index_jobs')
        .select(`
          *,
          users:user_id (
            id,
            email,
            full_name
          ),
          index_files:index_file_id (
            id,
            file_name,
            uploaded_at
          )
        `)
        .eq('id', jobId)
        .single();

      if (jobError) {
        console.error('Error fetching job:', jobError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch job',
          details: jobError.message 
        });
      }

      job = jobData;
    }

    // Get index details if indexId provided
    let indexData = null;
    if (indexId) {
      const { data: indexDataResult, error: indexError } = await supabaseAdmin
        .from('index_files')
        .select('*')
        .eq('id', indexId)
        .single();

      if (!indexError) {
        indexData = indexDataResult;
      }
    }

    // If we have a job, try to get the index from it
    if (job && job.index_file_id && !indexData) {
      const { data: indexDataResult } = await supabaseAdmin
        .from('index_files')
        .select('*')
        .eq('id', job.index_file_id)
        .single();

      if (indexDataResult) {
        indexData = indexDataResult;
      }
    }

    // Calculate metrics
    const result: any = {
      success: true,
      job: job ? {
        id: job.id,
        userId: job.user_id,
        userEmail: job.users?.email || 'Unknown',
        userName: job.users?.full_name || 'Unknown',
        fileKey: job.file_key,
        fileName: job.file_name,
        status: job.status,
        nextFrameIndex: job.next_frame_index || 0,
        totalFrames: job.total_frames || 0,
        progress: job.total_frames > 0 
          ? Math.round((job.next_frame_index / job.total_frames) * 100)
          : 0,
        indexFileId: job.index_file_id,
        error: job.error,
        parentJobId: job.parent_job_id,
        jobIndex: job.job_index || 0,
        totalJobs: job.total_jobs || 1,
        figmaVersion: job.figma_version,
        figmaLastModified: job.figma_last_modified,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        processingState: job.processing_state,
        selectedPages: job.selected_pages || [],
        selectedPageIds: job.selected_page_ids || [],
        // Raw data for debugging
        raw: {
          next_frame_index: job.next_frame_index,
          total_frames: job.total_frames,
          status: job.status,
          error: job.error,
          processing_state: job.processing_state,
        }
      } : null,
      index: indexData ? {
        id: indexData.id,
        file_name: indexData.file_name,
        user_id: indexData.user_id,
        uploaded_at: indexData.uploaded_at,
        // Check if index_data exists
        hasIndexData: !!indexData.index_data,
        indexDataType: typeof indexData.index_data,
        // Raw data
        raw: {
          id: indexData.id,
          file_name: indexData.file_name,
          uploaded_at: indexData.uploaded_at,
        }
      } : null,
    };

    // If job is stuck, provide analysis
    if (job && job.status === 'processing') {
      const updatedAt = new Date(job.updated_at);
      const now = new Date();
      const timeSinceUpdate = now.getTime() - updatedAt.getTime();
      const minutesSinceUpdate = Math.round(timeSinceUpdate / 60000);

      result.analysis = {
        isStuck: minutesSinceUpdate > 10, // Consider stuck if no update for 10+ minutes
        minutesSinceLastUpdate: minutesSinceUpdate,
        progressPercentage: job.total_frames > 0 
          ? Math.round((job.next_frame_index / job.total_frames) * 100)
          : 0,
        framesRemaining: (job.total_frames || 0) - (job.next_frame_index || 0),
        recommendations: [],
      };

      if (result.analysis.isStuck) {
        result.analysis.recommendations.push(
          'Job appears to be stuck. Consider resetting it or checking server logs.'
        );
      }

      if (job.error) {
        result.analysis.recommendations.push(
          `Job has error: ${job.error}`
        );
      }
    }

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Error in admin/debug-job:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

