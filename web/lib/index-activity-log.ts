import type { SupabaseClient } from '@supabase/supabase-js';

type IndexActivityInput = {
  requestId?: string | null;
  source: 'plugin' | 'api' | 'job' | 'system';
  eventType:
    | 'index_started'
    | 'index_completed'
    | 'index_failed'
    | 'job_started'
    | 'job_completed'
    | 'job_failed'
    | 'share_created'
    | 'share_updated'
    | 'share_deleted'
    | 'claim_started'
    | 'claim_completed'
    | 'claim_failed'
    | 'reset_indices'
    | 'index_deleted'
    | 'index_rate_limited';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userId?: string | null;
  ownerAnonId?: string | null;
  userEmail?: string | null;
  fileKey?: string | null;
  fileName?: string | null;
  logicalFileId?: string | null;
  pageCount?: number | null;
  frameCount?: number | null;
  durationMs?: number | null;
  message?: string | null;
  error?: string | null;
  metadata?: Record<string, any> | null;
};

export async function logIndexActivity(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  input: IndexActivityInput
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const payload = {
      request_id: input.requestId || null,
      source: input.source,
      event_type: input.eventType,
      status: input.status,
      user_id: input.userId || null,
      owner_anon_id: input.ownerAnonId || null,
      user_email: input.userEmail || null,
      file_key: input.fileKey || null,
      file_name: input.fileName || null,
      logical_file_id: input.logicalFileId || null,
      page_count: typeof input.pageCount === 'number' ? input.pageCount : null,
      frame_count: typeof input.frameCount === 'number' ? input.frameCount : null,
      duration_ms: typeof input.durationMs === 'number' ? input.durationMs : null,
      message: input.message || null,
      error: input.error || null,
      metadata: input.metadata || {},
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabaseAdmin.from('index_activity_log').insert(payload);
    if (error) {
      console.warn('[index-activity-log] failed to write activity log:', error.message);
    }
  } catch (error: any) {
    console.warn('[index-activity-log] unexpected logging failure:', error?.message || error);
  }
}
