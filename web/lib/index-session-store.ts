import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const INDEX_SESSION_STATUSES = [
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const;

export const INDEX_PAGE_JOB_STATUSES = [
  'queued',
  'uploading',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const;

export type IndexSessionStatus = typeof INDEX_SESSION_STATUSES[number];
export type IndexPageJobStatus = typeof INDEX_PAGE_JOB_STATUSES[number];

export interface IndexPageJobInput {
  pageId: string;
  pageName: string;
  sortOrder?: number;
  totalFrames?: number;
  chunkCount?: number;
  metadata?: Record<string, any>;
}

export interface CreateIndexSessionInput {
  userId: string;
  fileKey: string;
  projectId?: string | null;
  fileName: string;
  source?: 'plugin' | 'api';
  selectedPages?: string[];
  selectedPageIds?: string[];
  metadata?: Record<string, any>;
  pageJobs: IndexPageJobInput[];
}

export interface IndexSessionAggregate {
  id: string;
  user_id: string;
  file_key: string;
  project_id: string | null;
  file_name: string;
  source: string;
  status: IndexSessionStatus;
  total_pages: number;
  completed_pages: number;
  failed_pages: number;
  cancelled_pages: number;
  total_frames: number;
  processed_frames: number;
  current_page_job_id: string | null;
  cancel_requested: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  page_jobs?: any[];
}

function getServiceSupabase(): SupabaseClient<any, any, any, any, any> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(url, key);
}

export async function createIndexSession(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  input: CreateIndexSessionInput
) {
  const now = new Date().toISOString();
  const pageJobs = Array.isArray(input.pageJobs) ? input.pageJobs : [];
  const totalFrames = pageJobs.reduce((sum, page) => sum + Math.max(0, page.totalFrames || 0), 0);

  const sessionInsert = {
    user_id: input.userId,
    file_key: input.fileKey,
    project_id: input.projectId || null,
    file_name: input.fileName,
    source: input.source || 'plugin',
    status: 'queued' as IndexSessionStatus,
    total_pages: pageJobs.length,
    total_frames: totalFrames,
    selected_pages: input.selectedPages || [],
    selected_page_ids: input.selectedPageIds || [],
    metadata: input.metadata || {},
    created_at: now,
    updated_at: now,
  };

  const sessionResult = await supabaseAdmin
    .from('index_sessions')
    .insert(sessionInsert)
    .select('*')
    .single();

  if (sessionResult.error || !sessionResult.data) {
    throw new Error(sessionResult.error?.message || 'Failed to create index session');
  }

  const jobRows = pageJobs.map((page, index) => ({
    session_id: sessionResult.data.id,
    user_id: input.userId,
    file_key: input.fileKey,
    project_id: input.projectId || null,
    file_name: input.fileName,
    page_id: page.pageId,
    page_name: page.pageName,
    sort_order: page.sortOrder ?? index,
    status: 'queued' as IndexPageJobStatus,
    total_frames: Math.max(0, page.totalFrames || 0),
    chunk_count: Math.max(0, page.chunkCount || 0),
    metadata: page.metadata || {},
    created_at: now,
    updated_at: now,
  }));

  if (jobRows.length > 0) {
    const jobsResult = await supabaseAdmin
      .from('index_page_jobs')
      .insert(jobRows)
      .select('*');

    if (jobsResult.error) {
      await supabaseAdmin.from('index_sessions').delete().eq('id', sessionResult.data.id);
      throw new Error(jobsResult.error.message || 'Failed to create index page jobs');
    }
  }

  return sessionResult.data;
}

export async function getIndexSessionAggregate(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  sessionId: string,
  userId: string
): Promise<IndexSessionAggregate | null> {
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('index_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message || 'Failed to load index session');
  }

  if (!session) return null;

  const { data: pageJobs, error: jobsError } = await supabaseAdmin
    .from('index_page_jobs')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (jobsError) {
    throw new Error(jobsError.message || 'Failed to load index page jobs');
  }

  const jobs = Array.isArray(pageJobs) ? pageJobs : [];
  const completedPages = jobs.filter((job) => job.status === 'completed').length;
  const failedPages = jobs.filter((job) => job.status === 'failed').length;
  const cancelledPages = jobs.filter((job) => job.status === 'cancelled').length;
  const processedFrames = jobs.reduce((sum, job) => sum + Math.max(0, job.processed_frames || 0), 0);

  const inferredStatus: IndexSessionStatus = session.cancel_requested
    ? jobs.every((job) => ['completed', 'failed', 'cancelled'].includes(job.status))
      ? 'cancelled'
      : 'processing'
    : failedPages > 0 && completedPages === 0 && jobs.every((job) => ['failed', 'cancelled'].includes(job.status))
      ? 'failed'
      : completedPages === jobs.length && jobs.length > 0
        ? 'completed'
        : jobs.some((job) => ['uploading', 'processing'].includes(job.status))
          ? 'processing'
          : session.status;

  const aggregate = {
    ...session,
    status: inferredStatus,
    total_pages: jobs.length || session.total_pages || 0,
    completed_pages: completedPages,
    failed_pages: failedPages,
    cancelled_pages: cancelledPages,
    processed_frames: processedFrames,
    total_frames: jobs.reduce((sum, job) => sum + Math.max(0, job.total_frames || 0), 0) || session.total_frames || 0,
    page_jobs: jobs,
  };

  const needsSummaryUpdate =
    aggregate.status !== session.status ||
    aggregate.completed_pages !== session.completed_pages ||
    aggregate.failed_pages !== session.failed_pages ||
    aggregate.cancelled_pages !== session.cancelled_pages ||
    aggregate.processed_frames !== session.processed_frames ||
    aggregate.total_pages !== session.total_pages ||
    aggregate.total_frames !== session.total_frames;

  if (needsSummaryUpdate) {
    await supabaseAdmin
      .from('index_sessions')
      .update({
        status: aggregate.status,
        total_pages: aggregate.total_pages,
        completed_pages: aggregate.completed_pages,
        failed_pages: aggregate.failed_pages,
        cancelled_pages: aggregate.cancelled_pages,
        total_frames: aggregate.total_frames,
        processed_frames: aggregate.processed_frames,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId);
  }

  return aggregate;
}

export async function requestIndexSessionCancel(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  sessionId: string,
  userId: string
) {
  const now = new Date().toISOString();

  const { data: session, error } = await supabaseAdmin
    .from('index_sessions')
    .update({
      cancel_requested: true,
      updated_at: now,
    })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to request cancellation');
  }

  if (!session) {
    return null;
  }

  await supabaseAdmin
    .from('index_page_jobs')
    .update({
      status: 'cancelled',
      finished_at: now,
      updated_at: now,
      error: 'Cancelled before processing started',
    })
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .eq('status', 'queued');

  return session;
}

export async function setIndexSessionStatus(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  sessionId: string,
  userId: string,
  status: IndexSessionStatus,
  extra: Partial<{
    currentPageJobId: string | null;
    processedFrames: number;
    totalFrames: number;
    completedPages: number;
    failedPages: number;
    cancelledPages: number;
  }> = {}
) {
  const payload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if ('currentPageJobId' in extra) payload.current_page_job_id = extra.currentPageJobId ?? null;
  if (typeof extra.processedFrames === 'number') payload.processed_frames = extra.processedFrames;
  if (typeof extra.totalFrames === 'number') payload.total_frames = extra.totalFrames;
  if (typeof extra.completedPages === 'number') payload.completed_pages = extra.completedPages;
  if (typeof extra.failedPages === 'number') payload.failed_pages = extra.failedPages;
  if (typeof extra.cancelledPages === 'number') payload.cancelled_pages = extra.cancelledPages;

  const { error } = await supabaseAdmin
    .from('index_sessions')
    .update(payload)
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to update index session');
  }
}

export async function updateIndexPageJob(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  params: {
    sessionId: string;
    userId: string;
    pageId?: string | null;
    pageName?: string | null;
    status?: IndexPageJobStatus;
    processedFrames?: number;
    totalFrames?: number;
    uploadedChunkCount?: number;
    chunkCount?: number;
    attemptCount?: number;
    error?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
  }
) {
  const {
    sessionId,
    userId,
    pageId,
    pageName,
    status,
    processedFrames,
    totalFrames,
    uploadedChunkCount,
    chunkCount,
    attemptCount,
    error,
    startedAt,
    finishedAt,
  } = params;

  if (!pageId && !pageName) return null;

  let lookup = supabaseAdmin
    .from('index_page_jobs')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .limit(1);

  if (pageId) {
    lookup = lookup.eq('page_id', pageId);
  } else if (pageName) {
    lookup = lookup.eq('page_name', pageName);
  }

  const { data: job, error: jobLookupError } = await lookup.maybeSingle();
  if (jobLookupError || !job?.id) {
    return null;
  }

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (status) payload.status = status;
  if (typeof processedFrames === 'number') payload.processed_frames = processedFrames;
  if (typeof totalFrames === 'number') payload.total_frames = totalFrames;
  if (typeof uploadedChunkCount === 'number') payload.uploaded_chunk_count = uploadedChunkCount;
  if (typeof chunkCount === 'number') payload.chunk_count = chunkCount;
  if (typeof attemptCount === 'number') payload.attempt_count = attemptCount;
  if (typeof error === 'string' || error === null) payload.error = error;
  if (typeof startedAt === 'string' || startedAt === null) payload.started_at = startedAt;
  if (typeof finishedAt === 'string' || finishedAt === null) payload.finished_at = finishedAt;

  const { error: updateError } = await supabaseAdmin
    .from('index_page_jobs')
    .update(payload)
    .eq('id', job.id)
    .eq('session_id', sessionId)
    .eq('user_id', userId);

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update index page job');
  }

  return { id: job.id };
}

export async function markIndexSessionPagesFromManifest(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  params: {
    sessionId: string;
    userId: string;
    manifest: any[];
    status?: IndexPageJobStatus;
  }
) {
  const { sessionId, userId, manifest, status = 'completed' } = params;
  const pages = Array.isArray(manifest) ? manifest : [];
  const now = new Date().toISOString();

  for (const page of pages) {
    const processedFrames = Array.isArray(page?.frames) ? page.frames.length : 0;
    await updateIndexPageJob(supabaseAdmin, {
      sessionId,
      userId,
      pageId: typeof page?.id === 'string' ? page.id : null,
      pageName: typeof page?.name === 'string' ? page.name : null,
      status,
      processedFrames,
      totalFrames: processedFrames,
      finishedAt: status === 'completed' ? now : null,
      error: null,
    });
  }

  return getIndexSessionAggregate(supabaseAdmin, sessionId, userId);
}

export async function getUserFromApiKeyOrThrow(authorizationHeader?: string) {
  const supabaseAdmin = getServiceSupabase();
  const authHeader = typeof authorizationHeader === 'string' ? authorizationHeader : '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('API key required');
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
    throw new Error('Invalid API key format');
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, api_key, is_active')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (error || !user || user.is_active === false) {
    throw new Error('Invalid API key');
  }

  return { supabaseAdmin, user };
}
