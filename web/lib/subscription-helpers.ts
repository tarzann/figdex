/**
 * Subscription model helpers
 * Handles add-ons, rate limiting, and effective limits
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getPlanLimits } from './plans';

export interface UserEffectiveLimits {
  maxFiles: number;
  maxFrames: number;
  maxIndexesPerDay: number;
}

export interface CanCreateIndexResult {
  allowed: boolean;
  reason?: string;
  waitUntil?: Date;
  currentCount?: number;
  maxCount?: number;
}

/**
 * Get user's effective limits (base plan + addons)
 */
export async function getUserEffectiveLimits(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  userId: string,
  userPlan?: string | null,
  isAdmin?: boolean
): Promise<UserEffectiveLimits> {
  // Get plan limits
  const planLimits = getPlanLimits(userPlan, isAdmin);
  let maxFiles = planLimits.maxProjects || 0;
  let maxFrames = planLimits.maxFramesTotal || 0;
  let maxIndexesPerDay = planLimits.maxIndexesPerDay || 0;

  // Get active addons (today's date for comparison)
  const today = new Date().toISOString().split('T')[0];
  
  const { data: addons } = await supabaseAdmin
    .from('user_addons')
    .select('addon_type, addon_value')
    .eq('user_id', userId)
    .eq('status', 'active')
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (addons) {
    for (const addon of addons) {
      if (addon.addon_type === 'files') {
        maxFiles += addon.addon_value;
      } else if (addon.addon_type === 'frames') {
        maxFrames += addon.addon_value;
      } else if (addon.addon_type === 'rate_limit') {
        maxIndexesPerDay += addon.addon_value;
      }
    }
  }

  return { maxFiles, maxFrames, maxIndexesPerDay };
}

/**
 * Check if user can create index (rate limiting)
 */
export async function canCreateIndex(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  userId: string,
  userPlan?: string | null,
  isAdmin?: boolean
): Promise<CanCreateIndexResult> {
  // Admins and unlimited plans have no rate limit
  if (isAdmin) {
    return { allowed: true };
  }

  const planLimits = getPlanLimits(userPlan, isAdmin);
  if (planLimits.maxIndexesPerDay === null) {
    return { allowed: true };
  }

  // Get effective limits (plan + addons)
  const limits = await getUserEffectiveLimits(supabaseAdmin, userId, userPlan, isAdmin);

  // Get today's count (UTC)
  const today = new Date().toISOString().split('T')[0];
  const { data: todayCount } = await supabaseAdmin
    .from('daily_index_count')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const currentCount = todayCount?.count || 0;

  if (currentCount >= limits.maxIndexesPerDay) {
    // Calculate time until reset (midnight UTC tomorrow)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const hoursUntilReset = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));

    return {
      allowed: false,
      reason: `Daily limit reached (${limits.maxIndexesPerDay} indexes/day). Reset at midnight UTC (in ${hoursUntilReset} hours).`,
      waitUntil: tomorrow,
      currentCount,
      maxCount: limits.maxIndexesPerDay
    };
  }

  return {
    allowed: true,
    currentCount,
    maxCount: limits.maxIndexesPerDay
  };
}

/**
 * Increment daily index count
 */
export async function incrementDailyIndexCount(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  userId: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  // Try using the RPC function first (more efficient)
  try {
    const { data, error } = await supabaseAdmin.rpc('increment_daily_index_count', {
      p_user_id: userId,
      p_date: today
    });

    if (!error && data !== null && data !== undefined) {
      return data;
    }
  } catch (error) {
    // RPC function might not exist yet, fall back to manual update
    console.warn('RPC function increment_daily_index_count not available, using manual update');
  }

  // Manual update: check if record exists
  const { data: existing } = await supabaseAdmin
    .from('daily_index_count')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    const newCount = existing.count + 1;
    const { error } = await supabaseAdmin
      .from('daily_index_count')
      .update({ count: newCount })
      .eq('user_id', userId)
      .eq('date', today);

    if (error) {
      console.error('Error incrementing daily index count:', error);
      throw error;
    }

    return newCount;
  } else {
    // Create new record
    const { data, error } = await supabaseAdmin
      .from('daily_index_count')
      .insert({
        user_id: userId,
        date: today,
        count: 1
      })
      .select('count')
      .single();

    if (error) {
      console.error('Error creating daily index count:', error);
      throw error;
    }

    return data.count;
  }
}

/**
 * Get current file count for user
 */
export async function getCurrentFileCount(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  userId: string
): Promise<number> {
  const logicalFileIds = new Set<string>();

  const { data: savedConnections, error: connectionsError } = await supabaseAdmin
    .from('saved_connections')
    .select('file_key')
    .eq('user_id', userId);

  if (connectionsError) {
    console.error('Error getting file count from saved_connections:', connectionsError);
  } else if (Array.isArray(savedConnections)) {
    savedConnections.forEach((row: any) => {
      const fileKey = typeof row.file_key === 'string' ? row.file_key.trim() : '';
      if (fileKey) logicalFileIds.add(fileKey);
    });
  }

  const { data: indexFiles, error: indexFilesError } = await supabaseAdmin
    .from('index_files')
    .select('project_id, figma_file_key')
    .eq('user_id', userId);

  if (indexFilesError) {
    console.error('Error getting file count from index_files:', indexFilesError);
  } else if (Array.isArray(indexFiles)) {
    indexFiles.forEach((row: any) => {
      const fileKey = typeof row.figma_file_key === 'string' ? row.figma_file_key.trim() : '';
      const projectId = typeof row.project_id === 'string' ? row.project_id.trim() : '';
      const stableProjectId = projectId && projectId !== '0:0' ? projectId : '';
      const logicalFileId = fileKey || stableProjectId || '';
      if (logicalFileId) logicalFileIds.add(logicalFileId);
    });
  }

  return logicalFileIds.size;
}

/**
 * Get current frame count for user (estimated from index_files)
 */
export async function getCurrentFrameCount(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  userId: string
): Promise<number> {
  return getCurrentTotalFrames(supabaseAdmin, userId);
}

function countFramesInIndexData(indexData: unknown): number {
  if (!indexData) return 0;
  try {
    const data = typeof indexData === 'string' ? JSON.parse(indexData) : indexData;
    if (Array.isArray(data)) {
      return data.reduce((sum: number, page: any) => sum + (Array.isArray(page?.frames) ? page.frames.length : 0), 0);
    }
    if (data && typeof data === 'object' && Array.isArray((data as any).pages)) {
      return (data as any).pages.reduce((sum: number, page: any) => sum + (Array.isArray(page?.frames) ? page.frames.length : 0), 0);
    }
  } catch (_) {}
  return 0;
}

export async function getCurrentTotalFrames(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  userId: string
): Promise<number> {
  const { data: rows, error } = await supabaseAdmin
    .from('index_files')
    .select('index_data')
    .eq('user_id', userId);
  if (error || !rows) return 0;
  return rows.reduce((sum, row) => sum + countFramesInIndexData(row.index_data), 0);
}

/**
 * Get guest index file count (user_id null, owner_anon_id)
 */
export async function getGuestIndexFileCount(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  anonId: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('index_files')
    .select('*', { count: 'exact', head: true })
    .is('user_id', null)
    .eq('owner_anon_id', anonId);
  if (error) return 0;
  return count || 0;
}

/**
 * Get guest distinct Figma file count (unique figma_file_key per anonId).
 * Used for limit checks when using one-index-per-page model.
 */
export async function getGuestDistinctFileCount(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  anonId: string
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('index_files')
    .select('project_id, figma_file_key')
    .is('user_id', null)
    .eq('owner_anon_id', anonId);
  if (error || !data) return 0;
  const distinct = new Set(
    data
      .map((r: any) => {
        const projectId = typeof r.project_id === 'string' ? r.project_id.trim() : '';
        const fileKey = typeof r.figma_file_key === 'string' ? r.figma_file_key.trim() : '';
        const logicalProjectId = projectId && projectId !== '0:0' ? projectId : '';
        return fileKey || logicalProjectId || '';
      })
      .filter(Boolean)
  );
  return distinct.size;
}

/**
 * Get guest total frame count
 */
export async function getGuestTotalFrames(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  anonId: string
): Promise<number> {
  const { data: rows, error } = await supabaseAdmin
    .from('index_files')
    .select('index_data')
    .is('user_id', null)
    .eq('owner_anon_id', anonId);
  if (error || !rows) return 0;
  return rows.reduce((sum, row) => sum + countFramesInIndexData(row.index_data), 0);
}
