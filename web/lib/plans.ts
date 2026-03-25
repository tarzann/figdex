export type PlanId = 'free' | 'guest' | 'pro' | 'team' | 'unlimited';

export interface PlanLimits {
  id: PlanId;
  label: string;
  maxProjects: number | null; // File quota (soft limit)
  maxFramesTotal: number | null; // Frame quota (soft limit)
  creditsPerMonth: number | null; // Monthly credits (resets to this if lower) - DEPRECATED: use subscription model
  maxUploadsPerDay: number | null;
  maxUploadsPerMonth: number | null; // Monthly limit to prevent cost overruns
  maxFramesPerMonth: number | null; // Monthly frames limit to prevent cost overruns
  maxIndexSizeBytes: number | null;
  retentionDays: number | null;
  maxIndexesPerDay: number | null; // Daily rate limit for indexes (NEW)
}

export interface DbPlanRow {
  plan_id: PlanId;
  label: string | null;
  max_projects: number | null;
  max_frames_total: number | null;
  credits_per_month: number | null;
  max_uploads_per_day: number | null;
  max_uploads_per_month: number | null;
  max_frames_per_month: number | null;
  max_index_size_bytes: number | null;
  retention_days: number | null;
  max_indexes_per_day: number | null;
  enabled?: boolean | null;
}

const MB = 1024 * 1024;

const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  guest: {
    id: 'guest',
    label: 'Guest',
    maxProjects: 1,
    maxFramesTotal: 50,
    creditsPerMonth: null,
    maxUploadsPerDay: null,
    maxUploadsPerMonth: null,
    maxFramesPerMonth: null,
    maxIndexSizeBytes: 10 * MB,
    retentionDays: 7,
    maxIndexesPerDay: 5
  },
  free: {
    id: 'free',
    label: 'Free',
    maxProjects: 2, // 2 files quota (will be refined later)
    maxFramesTotal: 500, // 500 frames quota
    creditsPerMonth: 100, // 100 credits/month - DEPRECATED
    maxUploadsPerDay: null, // No daily limit
    maxUploadsPerMonth: null, // No monthly limit (will be refined later)
    maxFramesPerMonth: 500, // 500 frames per month
    maxIndexSizeBytes: 50 * MB,
    retentionDays: 30,
    maxIndexesPerDay: null // No rate limit (will be refined later)
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    maxProjects: 10, // 10 files quota (soft limit)
    maxFramesTotal: 5000, // 5,000 frames quota (soft limit)
    creditsPerMonth: 1000, // 1,000 credits/month (resets to 1,000 if lower) - DEPRECATED: use subscription model
    maxUploadsPerDay: null, // No daily limit (rate-limited by maxIndexesPerDay)
    maxUploadsPerMonth: null, // No monthly limit (rate-limited by maxIndexesPerDay)
    maxFramesPerMonth: null, // No monthly limit (quota-based)
    maxIndexSizeBytes: 500 * MB,
    retentionDays: 180,
    maxIndexesPerDay: 20 // Rate limit: 20 indexes per day
  },
  team: {
    id: 'team',
    label: 'Team',
    maxProjects: 20, // 20 files quota (soft limit)
    maxFramesTotal: 15000, // 15,000 frames quota (soft limit)
    creditsPerMonth: 2000, // 2,000 credits/month (resets to 2,000 if lower) - DEPRECATED: use subscription model
    maxUploadsPerDay: null, // No daily limit (rate-limited by maxIndexesPerDay)
    maxUploadsPerMonth: null, // No monthly limit (rate-limited by maxIndexesPerDay)
    maxFramesPerMonth: null, // No monthly limit (quota-based)
    maxIndexSizeBytes: 1000 * MB,
    retentionDays: 365,
    maxIndexesPerDay: 50 // Rate limit: 50 indexes per day
  },
  unlimited: {
    id: 'unlimited',
    label: 'Unlimited',
    maxProjects: null, // Unlimited files
    maxFramesTotal: null, // Unlimited frames
    creditsPerMonth: null, // Unlimited credits (or custom) - DEPRECATED: use subscription model
    maxUploadsPerDay: null,
    maxUploadsPerMonth: null, // No monthly limit (custom pricing handles costs)
    maxFramesPerMonth: null, // No monthly limit (custom pricing handles costs)
    maxIndexSizeBytes: null,
    retentionDays: null,
    maxIndexesPerDay: null // No rate limit
  }
};

export function resolvePlanId(plan?: string | null, isAdmin?: boolean): PlanId {
  if (isAdmin) return 'unlimited';
  if (!plan) return 'free';
  const normalized = plan.trim().toLowerCase();
  if (normalized === 'guest') return 'guest';
  if (normalized === 'pro') return 'pro';
  if (normalized === 'team') return 'team';
  if (normalized === 'unlimited' || normalized === 'enterprise') return 'unlimited';
  return 'free';
}

export function getPlanLimits(plan?: string | null, isAdmin?: boolean): PlanLimits {
  const planId = resolvePlanId(plan, isAdmin);
  return PLAN_LIMITS[planId];
}

export function mergePlanLimits(planId: PlanId, overrides?: Partial<PlanLimits> | null): PlanLimits {
  const base = PLAN_LIMITS[planId];
  return { ...base, ...(overrides || {}), id: planId };
}

export function dbPlanRowToPlanLimits(row: DbPlanRow, fallbackPlanId?: PlanId): PlanLimits {
  const planId = fallbackPlanId || row.plan_id;
  return mergePlanLimits(planId, {
    label: typeof row.label === 'string' && row.label.trim() ? row.label.trim() : PLAN_LIMITS[planId].label,
    maxProjects: row.max_projects ?? null,
    maxFramesTotal: row.max_frames_total ?? null,
    creditsPerMonth: row.credits_per_month ?? null,
    maxUploadsPerDay: row.max_uploads_per_day ?? null,
    maxUploadsPerMonth: row.max_uploads_per_month ?? null,
    maxFramesPerMonth: row.max_frames_per_month ?? null,
    maxIndexSizeBytes: row.max_index_size_bytes ?? null,
    retentionDays: row.retention_days ?? null,
    maxIndexesPerDay: row.max_indexes_per_day ?? null,
  });
}

export async function getPlanLimitsFromDb(
  supabaseAdmin: { from: (table: string) => any },
  plan?: string | null,
  isAdmin?: boolean
): Promise<PlanLimits> {
  const planId = resolvePlanId(plan, isAdmin);
  if (!supabaseAdmin || typeof supabaseAdmin.from !== 'function') {
    return getPlanLimits(plan, isAdmin);
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('plan_id,label,max_projects,max_frames_total,credits_per_month,max_uploads_per_day,max_uploads_per_month,max_frames_per_month,max_index_size_bytes,retention_days,max_indexes_per_day,enabled')
      .eq('plan_id', planId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return getPlanLimits(plan, isAdmin);
    }

    return dbPlanRowToPlanLimits(data as DbPlanRow, planId);
  } catch (_) {
    return getPlanLimits(plan, isAdmin);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0 || Number.isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Credit costs for different actions
 */
export const CREDIT_COSTS = {
  // Indexing
  FILE_INDEX: 100, // 1 file index = 100 credits
  FILE_REINDEX: 50, // 1 file re-index = 50 credits (cheaper than first index)
  
  // Quota increases (monthly)
  ADD_FILE_QUOTA: 200, // +1 file quota = 200 credits/month
  ADD_2_FILES_QUOTA: 350, // +2 files quota = 350 credits/month
  ADD_5_FILES_QUOTA: 800, // +5 files quota = 800 credits/month
  
  ADD_1000_FRAMES_QUOTA: 150, // +1,000 frames quota = 150 credits/month
  ADD_2000_FRAMES_QUOTA: 280, // +2,000 frames quota = 280 credits/month
  ADD_5000_FRAMES_QUOTA: 600, // +5,000 frames quota = 600 credits/month
  
  // Team discounts
  TEAM_ADD_FILE_QUOTA: 150, // Team: +1 file quota = 150 credits/month (discounted)
  TEAM_ADD_2_FILES_QUOTA: 300, // Team: +2 files quota = 300 credits/month
  TEAM_ADD_1000_FRAMES_QUOTA: 120, // Team: +1,000 frames quota = 120 credits/month (discounted)
} as const;

/**
 * Credit purchase options
 */
export const CREDIT_PACKAGES = [
  { credits: 500, price: 10, priceId: 'credits_500' },
  { credits: 1000, price: 18, priceId: 'credits_1000' },
  { credits: 2000, price: 35, priceId: 'credits_2000' },
  { credits: 5000, price: 80, priceId: 'credits_5000' }, // Team/Enterprise
] as const;

/**
 * Calculate credit cost for an action
 */
export function getCreditCost(action: keyof typeof CREDIT_COSTS, planId: PlanId): number {
  // Team gets discounts on quota increases
  if (planId === 'team' && action.startsWith('TEAM_')) {
    return CREDIT_COSTS[action as keyof typeof CREDIT_COSTS];
  }
  // Remove TEAM_ prefix for team plans
  if (planId === 'team' && action.startsWith('ADD_')) {
    const teamAction = `TEAM_${action}` as keyof typeof CREDIT_COSTS;
    if (teamAction in CREDIT_COSTS) {
      return CREDIT_COSTS[teamAction];
    }
  }
  return CREDIT_COSTS[action];
}

/**
 * Check if credits should reset (if current < base, reset to base)
 */
export function shouldResetCredits(currentCredits: number, baseCredits: number | null): boolean {
  if (baseCredits === null) return false; // Unlimited plan
  return currentCredits < baseCredits;
}

/**
 * Get reset credits amount (returns base if should reset, otherwise current)
 */
export function getResetCredits(currentCredits: number, baseCredits: number | null): number {
  if (baseCredits === null) return currentCredits; // Unlimited plan
  return Math.max(currentCredits, baseCredits);
}
