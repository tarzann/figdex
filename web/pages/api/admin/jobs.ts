import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

function isMissingRelation(error: any, relationName: string): boolean {
  const message = String(error?.message || '');
  return error?.code === '42P01' || message.includes(relationName);
}

function mapLegacyJob(job: any) {
  const createdAt = new Date(job.created_at);
  const updatedAt = new Date(job.updated_at || job.created_at);
  const processingTime = Math.max(0, updatedAt.getTime() - createdAt.getTime());
  const totalFrames = typeof job.total_frames === 'number' ? job.total_frames : 0;
  const nextFrameIndex = typeof job.next_frame_index === 'number' ? job.next_frame_index : 0;
  const progress = totalFrames > 0 ? Math.min(100, Math.round((nextFrameIndex / totalFrames) * 100)) : 0;

  return {
    id: job.id,
    requestId: null,
    source: 'legacy-job',
    eventType: 'job',
    userId: job.user_id,
    userEmail: job.users?.email || 'Unknown',
    userName: job.users?.full_name || 'Unknown',
    fileKey: job.file_key || '',
    fileName: job.file_name || 'Untitled',
    status: job.status,
    nextFrameIndex,
    totalFrames,
    progress,
    indexFileId: job.index_file_id,
    error: job.error,
    message: null,
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
    canDebug: true,
    debugUrl: `/api/admin/debug-job?jobId=${job.id}`,
  };
}

function mapActivityRow(row: any) {
  const createdAt = new Date(row.created_at);
  const updatedAt = new Date(row.updated_at || row.created_at);
  const processingTime = typeof row.duration_ms === 'number'
    ? row.duration_ms
    : Math.max(0, updatedAt.getTime() - createdAt.getTime());
  const totalFrames = typeof row.frame_count === 'number' ? row.frame_count : 0;
  const progress = row.status === 'completed' ? 100 : row.status === 'failed' ? 0 : 0;

  return {
    id: row.id,
    requestId: row.request_id || null,
    source: row.source || 'system',
    eventType: row.event_type || 'event',
    userId: row.user_id || null,
    userEmail: row.user_email || 'Unknown',
    userName: '—',
    fileKey: row.file_key || '',
    fileName: row.file_name || 'Untitled',
    status: row.status || 'pending',
    nextFrameIndex: row.metadata?.nextFrameIndex || 0,
    totalFrames: row.metadata?.totalFrames || totalFrames,
    progress,
    indexFileId: row.metadata?.indexId || null,
    error: row.error || null,
    message: row.message || null,
    parentJobId: null,
    jobIndex: 0,
    totalJobs: 1,
    figmaVersion: null,
    figmaLastModified: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processingTimeMs: processingTime,
    processingTimeSeconds: Math.round(processingTime / 1000),
    processingTimeMinutes: Math.round(processingTime / 60000),
    selectedPages: [],
    selectedPageIds: [],
    canDebug: false,
    debugUrl: null,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    const activityResp = await supabaseAdmin
      .from('index_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    let activityRows: any[] = [];
    if (!activityResp.error) {
      activityRows = Array.isArray(activityResp.data) ? activityResp.data : [];
    } else if (!isMissingRelation(activityResp.error, 'index_activity_log')) {
      console.error('Error fetching index activity log:', activityResp.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch index activity log',
        details: activityResp.error.message,
      });
    }

    if (activityRows.length > 0) {
      const jobs = activityRows.map(mapActivityRow);
      return res.status(200).json({
        success: true,
        jobs,
        total: jobs.length,
        mode: 'activity',
        supportsFailStuckJobs: false,
      });
    }

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
      .limit(1000);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch jobs',
        details: jobsError.message,
      });
    }

    const jobsWithMetrics = (jobs || []).map(mapLegacyJob);

    return res.status(200).json({
      success: true,
      jobs: jobsWithMetrics,
      total: jobsWithMetrics.length,
      mode: 'legacy',
      supportsFailStuckJobs: true,
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
