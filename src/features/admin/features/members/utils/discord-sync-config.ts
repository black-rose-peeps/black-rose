import type { MemberSyncQueueConfig } from "../types";

export const DEFAULT_MEMBER_SYNC_QUEUE_CONFIG: MemberSyncQueueConfig = {
  hotDays: 30,
  coldSweepIntervalMinutes: 1440,
};

/** Serializable sync summary returned to the client from server functions. */
export interface DiscordSyncSummary {
  checked?: number;
  updated?: number;
  verified?: number;
  unverified?: number;
  deferred?: number;
  notVerifiedQueued?: number;
  notVerifiedHotQueued?: number;
  notVerifiedColdQueued?: number;
  notVerifiedPaused?: number;
  syncPaused?: number;
  page?: number;
  totalPages?: number;
  priorityNotVerified?: boolean;
  coldSweep?: boolean;
  syncQueueConfig?: MemberSyncQueueConfig;
}

/** Raw Worker JSON before queueConfig is normalized for the client. */
export interface DiscordSyncWorkerResponse extends DiscordSyncSummary {
  queueConfig?: MemberSyncQueueConfig;
}

export function formatColdSweepCadence(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? "daily" : `every ${days} days`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "hourly" : `every ${hours} hours`;
  }
  return `every ${minutes} minutes`;
}

export function normalizeWorkerQueueConfig(value: unknown): MemberSyncQueueConfig | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const hotDays = Number(record.hotDays);
  const coldSweepIntervalMinutes = Number(record.coldSweepIntervalMinutes);

  if (!Number.isFinite(hotDays) || hotDays < 1) return null;
  if (!Number.isFinite(coldSweepIntervalMinutes) || coldSweepIntervalMinutes < 15) {
    return null;
  }

  return {
    hotDays: Math.min(hotDays, 365),
    coldSweepIntervalMinutes: Math.min(coldSweepIntervalMinutes, 60 * 24 * 30),
  };
}

export function formatDiscordSyncMessage(
  summary: DiscordSyncSummary,
  config?: Pick<MemberSyncQueueConfig, "coldSweepIntervalMinutes">,
): string {
  const checked = summary.checked ?? 0;
  const verified = summary.verified ?? 0;
  const unverified = summary.unverified ?? 0;
  const updated = summary.updated ?? 0;
  const deferred = summary.deferred ?? 0;
  const queued = summary.notVerifiedHotQueued ?? summary.notVerifiedQueued ?? 0;
  const cold = summary.notVerifiedColdQueued ?? 0;
  const paused = summary.notVerifiedPaused ?? 0;
  const priority = summary.priorityNotVerified ?? false;
  const syncPaused = summary.syncPaused ?? 0;
  const coldSweepMinutes =
    config?.coldSweepIntervalMinutes ??
    summary.syncQueueConfig?.coldSweepIntervalMinutes ??
    DEFAULT_MEMBER_SYNC_QUEUE_CONFIG.coldSweepIntervalMinutes;

  const parts: string[] = ["Discord sync completed."];

  if (checked > 0) {
    parts.push(`Checked ${checked} member${checked === 1 ? "" : "s"}.`);
  }

  if (verified > 0) {
    parts.push(`${verified} newly verified.`);
  }

  if (unverified > 0) {
    parts.push(`${unverified} marked not verified.`);
  }

  if (updated === 0 && checked > 0) {
    parts.push("No status changes.");
  }

  if (deferred > 0) {
    parts.push(
      `${deferred} member${deferred === 1 ? "" : "s"} deferred — run sync again to continue.`,
    );
  }

  if (syncPaused > 0) {
    parts.push(`${syncPaused} member${syncPaused === 1 ? "" : "s"} paused (not in Discord guild).`);
  }

  if (queued > checked) {
    parts.push(
      priority
        ? `${queued} in the hot queue — this run checked the ${checked} newest active Not Verified member${checked === 1 ? "" : "s"}. Run sync again to continue.`
        : `${queued} in the hot Not Verified queue. Cron always checks newest first; use Sync Discord now during verification waves.`,
    );
  }

  if (cold > 0 || paused > 0) {
    const extras: string[] = [];
    if (cold > 0) extras.push(`${cold} cold (older than hot window)`);
    if (paused > 0) extras.push(`${paused} paused`);
    parts.push(
      `Backlog: ${extras.join(", ")} — cold/paused members are swept ${formatColdSweepCadence(coldSweepMinutes)}, not every cron run.`,
    );
  }

  return parts.join(" ");
}
