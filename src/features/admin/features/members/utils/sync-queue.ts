import { DEFAULT_SYNC_HOT_DAYS } from "../constants";
import type {
  AdminMember,
  MemberSyncQueueConfig,
  MemberSyncQueueFilter,
  MemberSyncQueueTier,
} from "../types";
import { formatColdSweepCadence } from "./discord-sync-config";

export function getSyncHotCutoffMs(hotDays = DEFAULT_SYNC_HOT_DAYS): number {
  return Date.now() - hotDays * 24 * 60 * 60 * 1000;
}

export function getMemberSyncQueueTier(
  member: Pick<AdminMember, "status" | "createdAt" | "discordId" | "discordSyncPausedAt">,
  hotDays = DEFAULT_SYNC_HOT_DAYS,
): MemberSyncQueueTier | null {
  if (member.status !== "Not Verified" || !member.discordId?.trim()) return null;
  if (member.discordSyncPausedAt) return "paused";

  const createdMs = Date.parse(member.createdAt);
  if (!Number.isFinite(createdMs)) return "cold";

  return createdMs >= getSyncHotCutoffMs(hotDays) ? "hot" : "cold";
}

export function matchesSyncQueueFilter(
  member: AdminMember,
  filter: MemberSyncQueueFilter,
  hotDays = DEFAULT_SYNC_HOT_DAYS,
): boolean {
  if (filter === "all") return true;

  const tier = getMemberSyncQueueTier(member, hotDays);
  if (filter === "backlog") return tier === "cold" || tier === "paused";
  return tier === filter;
}

export function countMembersBySyncQueueFilter(
  members: AdminMember[],
  hotDays = DEFAULT_SYNC_HOT_DAYS,
): Record<MemberSyncQueueFilter, number> {
  const counts: Record<MemberSyncQueueFilter, number> = {
    all: members.length,
    hot: 0,
    cold: 0,
    paused: 0,
    backlog: 0,
  };

  for (const member of members) {
    const tier = getMemberSyncQueueTier(member, hotDays);
    if (tier === "hot") counts.hot += 1;
    if (tier === "cold") counts.cold += 1;
    if (tier === "paused") counts.paused += 1;
    if (tier === "cold" || tier === "paused") counts.backlog += 1;
  }

  return counts;
}

export function syncQueueTierLabel(tier: MemberSyncQueueTier): string {
  switch (tier) {
    case "hot":
      return "Hot queue";
    case "cold":
      return "Cold queue";
    case "paused":
      return "Paused";
  }
}

/** Short admin-facing copy for the active sync queue tab. */
export function getSyncQueueFilterDescription(
  filter: MemberSyncQueueFilter,
  config: MemberSyncQueueConfig = {
    hotDays: DEFAULT_SYNC_HOT_DAYS,
    coldSweepIntervalMinutes: 1440,
  },
): string | null {
  const hotDays = config.hotDays;
  const sweepLabel = formatColdSweepCadence(config.coldSweepIntervalMinutes);

  switch (filter) {
    case "all":
      return "Full roster. Use the queue tabs below to focus Discord ROSE verification backlog.";
    case "hot":
      return `Not Verified sign-ups from the last ${hotDays} days (not paused). Checked on every automatic sync and Sync Discord now.`;
    case "cold":
      return `Not Verified sign-ups older than ${hotDays} days. Swept ${sweepLabel} — use Sync member for an immediate check.`;
    case "paused":
      return 'Auto-sync stopped after repeated “not in Discord” results. Skipped until you Unpause or Sync member.';
    case "backlog":
      return `Cold and paused members outside the hot queue. Swept ${sweepLabel}; use Sync member or Unpause when someone should be verified now.`;
  }
}

export function memberNeedsSyncQueueReset(
  member: Pick<AdminMember, "discordSyncPausedAt" | "discordNotInGuildStrikes">,
): boolean {
  return Boolean(member.discordSyncPausedAt) || member.discordNotInGuildStrikes > 0;
}

export function memberIsStaleSyncCandidate(
  member: AdminMember,
  hotDays = DEFAULT_SYNC_HOT_DAYS,
): boolean {
  const tier = getMemberSyncQueueTier(member, hotDays);
  return tier === "cold" || tier === "paused";
}
