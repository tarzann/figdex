import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type ActivityRow = {
  id: string;
  event_type: string | null;
  status: string | null;
  source: string | null;
  user_id: string | null;
  owner_anon_id: string | null;
  user_email: string | null;
  request_id: string | null;
  file_name: string | null;
  created_at: string;
  error: string | null;
  message: string | null;
  metadata: Record<string, any> | null;
};

type FlowStepSummary = {
  key: string;
  label: string;
  description: string;
  eventCount: number;
  actorCount: number;
  conversionFromPrevious: number | null;
};

const DEFAULT_WINDOW_DAYS = 30;

function getActorKey(row: ActivityRow): string | null {
  const userId = typeof row.user_id === 'string' && row.user_id.trim() ? row.user_id.trim() : '';
  const anonId = typeof row.owner_anon_id === 'string' && row.owner_anon_id.trim() ? row.owner_anon_id.trim() : '';
  const email = typeof row.user_email === 'string' && row.user_email.trim() ? row.user_email.trim().toLowerCase() : '';
  const requestId = typeof row.request_id === 'string' && row.request_id.trim() ? row.request_id.trim() : '';

  if (userId) return `user:${userId}`;
  if (anonId) return `anon:${anonId}`;
  if (email) return `email:${email}`;
  if (requestId) return `request:${requestId}`;
  return null;
}

function countStep(rows: ActivityRow[], predicate: (row: ActivityRow) => boolean) {
  const matching = rows.filter(predicate);
  const actors = new Set<string>();
  matching.forEach((row) => {
    const actorKey = getActorKey(row);
    if (actorKey) actors.add(actorKey);
  });
  return {
    eventCount: matching.length,
    actorCount: actors.size,
  };
}

function buildStep(
  key: string,
  label: string,
  description: string,
  eventCount: number,
  actorCount: number,
  previousActorCount: number | null
): FlowStepSummary {
  return {
    key,
    label,
    description,
    eventCount,
    actorCount,
    conversionFromPrevious:
      typeof previousActorCount === 'number' && previousActorCount > 0
        ? Math.round((actorCount / previousActorCount) * 100)
        : null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const windowDays = Math.max(
      1,
      Math.min(90, Number.parseInt(String(req.query.days || DEFAULT_WINDOW_DAYS), 10) || DEFAULT_WINDOW_DAYS)
    );
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const [activityResp, recentUsersResp] = await Promise.all([
      supabase
        .from('index_activity_log')
        .select(
          'id,event_type,status,source,user_id,owner_anon_id,user_email,request_id,file_name,created_at,error,message,metadata'
        )
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10000),
      supabase
        .from('users')
        .select('id,email,plan,created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

    if (activityResp.error) {
      console.error('Error loading user flow activity:', activityResp.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to load activity log',
        details: activityResp.error.message,
      });
    }

    if (recentUsersResp.error) {
      console.error('Error loading recent users for user flow:', recentUsersResp.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to load recent users',
        details: recentUsersResp.error.message,
      });
    }

    const rows = (activityResp.data || []) as ActivityRow[];
    const recentUsers = recentUsersResp.data || [];

    const pluginOpened = countStep(
      rows,
      (row) => row.event_type === 'telemetry_plugin_boot' || row.event_type === 'plugin_connected'
    );
    const guestFlow = countStep(
      rows,
      (row) =>
        row.event_type === 'gallery_loaded' &&
        !row.user_id &&
        (!!row.owner_anon_id || row.metadata?.mode === 'guest')
    );
    const pluginConnected = countStep(
      rows,
      (row) =>
        row.event_type === 'plugin_connected' ||
        row.event_type === 'telemetry_connect_success'
    );
    const claimStarted = countStep(
      rows,
      (row) => row.event_type === 'claim_started'
    );
    const claimCompleted = countStep(
      rows,
      (row) => row.event_type === 'claim_completed'
    );
    const freeSignups = {
      eventCount: recentUsers.filter((user: any) => (user.plan || 'free') === 'free').length,
      actorCount: recentUsers.filter((user: any) => (user.plan || 'free') === 'free').length,
    };
    const indexStarted = countStep(
      rows,
      (row) => row.event_type === 'job_started' || row.event_type === 'index_started'
    );
    const indexCompleted = countStep(
      rows,
      (row) => row.event_type === 'job_completed' || row.event_type === 'index_completed'
    );
    const indexFailed = countStep(
      rows,
      (row) => row.event_type === 'job_failed' || row.event_type === 'index_failed'
    );
    const rateLimited = countStep(
      rows,
      (row) => row.event_type === 'index_rate_limited'
    );
    const searches = countStep(
      rows,
      (row) => row.event_type === 'file_search'
    );

    const steps: FlowStepSummary[] = [];
    steps.push(
      buildStep(
        'plugin-opened',
        'Plugin opened',
        'Users who opened or reconnected the plugin.',
        pluginOpened.eventCount,
        pluginOpened.actorCount,
        null
      )
    );
    steps.push(
      buildStep(
        'guest-flow',
        'Guest flow reached',
        'Anonymous users who loaded the gallery before signing up.',
        guestFlow.eventCount,
        guestFlow.actorCount,
        pluginOpened.actorCount
      )
    );
    steps.push(
      buildStep(
        'plugin-connected',
        'Plugin connected',
        'Users who completed the plugin connection flow.',
        pluginConnected.eventCount,
        pluginConnected.actorCount,
        guestFlow.actorCount || pluginOpened.actorCount
      )
    );
    steps.push(
      buildStep(
        'claim-started',
        'Claim started',
        'Users who began converting a guest flow into a full account.',
        claimStarted.eventCount,
        claimStarted.actorCount,
        pluginConnected.actorCount
      )
    );
    steps.push(
      buildStep(
        'claim-completed',
        'Claim completed',
        'Users who completed the guest-to-user claim flow.',
        claimCompleted.eventCount,
        claimCompleted.actorCount,
        claimStarted.actorCount
      )
    );
    steps.push(
      buildStep(
        'free-signups',
        'Free users created',
        'New free accounts created in the selected time window.',
        freeSignups.eventCount,
        freeSignups.actorCount,
        claimCompleted.actorCount || claimStarted.actorCount
      )
    );
    steps.push(
      buildStep(
        'index-started',
        'First indexing attempts',
        'Users who started an indexing run.',
        indexStarted.eventCount,
        indexStarted.actorCount,
        freeSignups.actorCount || pluginConnected.actorCount
      )
    );
    steps.push(
      buildStep(
        'index-completed',
        'Successful indexing',
        'Users who completed an indexing run successfully.',
        indexCompleted.eventCount,
        indexCompleted.actorCount,
        indexStarted.actorCount
      )
    );

    const topFailureRows = rows
      .filter((row) => row.status === 'failed' || row.event_type === 'index_rate_limited')
      .slice(0, 20)
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        eventType: row.event_type,
        status: row.status,
        userEmail: row.user_email,
        fileName: row.file_name,
        message: row.error || row.message || '',
      }));

    const recentFlowEvents = rows.slice(0, 30).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      eventType: row.event_type,
      status: row.status,
      source: row.source,
      userEmail: row.user_email,
      fileName: row.file_name,
      message: row.message || row.error || '',
    }));

    return res.status(200).json({
      success: true,
      windowDays,
      generatedAt: new Date().toISOString(),
      funnel: {
        steps,
        metrics: {
          pluginOpened,
          guestFlow,
          pluginConnected,
          claimStarted,
          claimCompleted,
          freeSignups,
          indexStarted,
          indexCompleted,
          indexFailed,
          rateLimited,
          searches,
        },
      },
      recentFlowEvents,
      topFailureRows,
    });
  } catch (error: any) {
    console.error('Error in admin/user-flow:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
    });
  }
}
