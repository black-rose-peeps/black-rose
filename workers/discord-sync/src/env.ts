/** Workers Free allows 50 subrequests per cron invocation (Supabase + Discord fetches). */
export const WORKERS_FREE_SUBREQUEST_BUDGET = 50;

/** Supabase count + member query at the start of each run. */
export const SUBREQUEST_STARTUP_COST = 2;

/** Safety margin before the hard limit. */
export const SUBREQUEST_MARGIN = 2;

export interface Env {
  DISCORD_BOT_TOKEN: string;
  DISCORD_GUILD_ID: string;
  DISCORD_ROSE_ROLE_ID?: string;
  DISCORD_ROSE_ROLE_NAME?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Optional bearer token for manual POST /sync triggers. */
  SYNC_SECRET?: string;
  /** Boost window for 1-minute cadence after manual trigger (default 10). */
  SYNC_BOOST_WINDOW_MINUTES?: string;
  /** Baseline cadence when not boosted (default 15). */
  SYNC_BASELINE_INTERVAL_MINUTES?: string;
  /** Max members loaded per cron page (default 22 for Workers Free). */
  SYNC_BATCH_SIZE?: string;
  /** Not Verified members newer than this many days are in the hot queue (default 30). */
  SYNC_HOT_DAYS?: string;
  /** Consecutive not-in-guild misses before pausing Worker polls (default 3). */
  SYNC_NOT_IN_GUILD_STRIKE_LIMIT?: string;
  /** Minutes between cold-queue / paused-recovery sweeps on cron (default 1440 = daily). */
  SYNC_COLD_SWEEP_INTERVAL_MINUTES?: string;
}

/** Worst case per member: Discord fetch + Supabase status update. */
export function getMaxMembersPerRun(env: Env): number {
  const parsed = Number.parseInt(env.SYNC_BATCH_SIZE ?? "22", 10);
  const configured = Number.isFinite(parsed) && parsed >= 1 ? parsed : 22;
  const budget =
    WORKERS_FREE_SUBREQUEST_BUDGET - SUBREQUEST_STARTUP_COST - SUBREQUEST_MARGIN;
  const worstCasePerMember = 2;
  const maxForFreeTier = Math.floor(budget / worstCasePerMember);
  return Math.min(configured, maxForFreeTier, 500);
}

export function getBoostWindowMinutes(env: Env): number {
  const parsed = Number.parseInt(env.SYNC_BOOST_WINDOW_MINUTES ?? "10", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  return Math.min(parsed, 60);
}

export function getBaselineIntervalMinutes(env: Env): number {
  const parsed = Number.parseInt(env.SYNC_BASELINE_INTERVAL_MINUTES ?? "15", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 15;
  return Math.min(parsed, 60);
}

export function getHotQueueDays(env: Env): number {
  const parsed = Number.parseInt(env.SYNC_HOT_DAYS ?? "30", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 30;
  return Math.min(parsed, 365);
}

export function getNotInGuildStrikeLimit(env: Env): number {
  const parsed = Number.parseInt(env.SYNC_NOT_IN_GUILD_STRIKE_LIMIT ?? "3", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 3;
  return Math.min(parsed, 10);
}

export function getColdSweepIntervalMinutes(env: Env): number {
  const parsed = Number.parseInt(env.SYNC_COLD_SWEEP_INTERVAL_MINUTES ?? "1440", 10);
  if (!Number.isFinite(parsed) || parsed < 15) return 1440;
  return Math.min(parsed, 60 * 24 * 30);
}

export interface SyncQueueConfig {
  hotDays: number;
  coldSweepIntervalMinutes: number;
  notInGuildStrikeLimit: number;
}

export function getSyncQueueConfig(env: Env): SyncQueueConfig {
  return {
    hotDays: getHotQueueDays(env),
    coldSweepIntervalMinutes: getColdSweepIntervalMinutes(env),
    notInGuildStrikeLimit: getNotInGuildStrikeLimit(env),
  };
}
