import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";
import {
  getBaselineIntervalMinutes,
  getColdSweepIntervalMinutes,
  getHotQueueDays,
  getMaxMembersPerRun,
  getNotInGuildStrikeLimit,
  SUBREQUEST_MARGIN,
  WORKERS_FREE_SUBREQUEST_BUDGET,
} from "./env";
import { fetchGuildMemberRoleIds, resolveRoseRoleId } from "./discord";
import {
  countNotVerifiedQueues,
  fetchColdNotVerifiedPage,
  fetchHotNotVerifiedPage,
  fetchPausedNotVerifiedPage,
  hotCutoffIso,
  runsPerColdSweep,
  type MemberStatus,
  type SyncMemberRow,
} from "./sync-queue";
import { buildStrikeUpdate, type MemberRow } from "./sync-strike";

/** Minimum batch slots reserved for verified ROSE-removal checks each run. */
function verifiedReservedSlots(batchSize: number): number {
  return Math.max(1, Math.min(4, Math.floor(batchSize / 5)));
}

export interface SyncSummary {
  checked: number;
  updated: number;
  verified: number;
  unverified: number;
  notInGuild: number;
  skipped: number;
  errors: number;
  deferred: number;
  subrequestsUsed: number;
  page: number;
  totalPages: number;
  batchSize: number;
  /** Active hot-queue size (Not Verified, unpaused, created within SYNC_HOT_DAYS). */
  notVerifiedQueued: number;
  notVerifiedHotQueued: number;
  notVerifiedColdQueued: number;
  notVerifiedPaused: number;
  queueTier: "hot" | "cold" | "paused-recovery" | "mixed";
  coldSweep: boolean;
  syncPaused: number;
  strikesReset: number;
  priorityNotVerified?: boolean;
}

export interface SyncRoseRolesOptions {
  /**
   * Manual/admin runs: always check the newest hot Not Verified members (page 0)
   * and skip verified-member audits for maximum verification throughput.
   */
  priorityNotVerified?: boolean;
}

export async function syncRoseRoles(
  env: Env,
  options?: SyncRoseRolesOptions,
): Promise<SyncSummary> {
  const batchSize = getMaxMembersPerRun(env);
  const hotDays = getHotQueueDays(env);
  const strikeLimit = getNotInGuildStrikeLimit(env);
  const baselineIntervalMinutes = getBaselineIntervalMinutes(env);
  const coldSweepIntervalMinutes = getColdSweepIntervalMinutes(env);
  const coldSweepEveryNRuns = runsPerColdSweep(
    coldSweepIntervalMinutes,
    baselineIntervalMinutes,
  );

  const summary: SyncSummary = {
    checked: 0,
    updated: 0,
    verified: 0,
    unverified: 0,
    notInGuild: 0,
    skipped: 0,
    errors: 0,
    deferred: 0,
    subrequestsUsed: 0,
    page: 0,
    totalPages: 1,
    batchSize,
    notVerifiedQueued: 0,
    notVerifiedHotQueued: 0,
    notVerifiedColdQueued: 0,
    notVerifiedPaused: 0,
    queueTier: "hot",
    coldSweep: false,
    syncPaused: 0,
    strikesReset: 0,
    priorityNotVerified: options?.priorityNotVerified ?? false,
  };

  const roseRoleId = await resolveRoseRoleId(env);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rotationMs = baselineIntervalMinutes * 60 * 1000;
  const rotationTick = Math.floor(Date.now() / rotationMs);
  const cutoffIso = hotCutoffIso(hotDays);
  const priorityNotVerified = options?.priorityNotVerified ?? false;

  const queueCounts = await countNotVerifiedQueues(supabase, cutoffIso);
  summary.subrequestsUsed += 3;

  summary.notVerifiedHotQueued = queueCounts.hot;
  summary.notVerifiedColdQueued = queueCounts.cold;
  summary.notVerifiedPaused = queueCounts.paused;
  summary.notVerifiedQueued = queueCounts.hot;

  const hotPages = Math.max(1, Math.ceil(queueCounts.hot / batchSize));
  const hotPage = 0;
  const hotFrom = hotPage * batchSize;
  const hotTo = hotFrom + batchSize - 1;

  summary.page = hotPage;
  summary.totalPages = hotPages;

  const reservedForVerified = priorityNotVerified ? 0 : verifiedReservedSlots(batchSize);
  const notVerifiedLimit = batchSize - reservedForVerified;

  const hotRows = await fetchHotNotVerifiedPage(supabase, cutoffIso, hotFrom, hotTo);
  summary.subrequestsUsed += 1;

  const members: MemberRow[] = hotRows.slice(0, notVerifiedLimit);
  let remainingSlots = priorityNotVerified ? 0 : batchSize - members.length;

  const isColdSweepRun =
    !priorityNotVerified && remainingSlots > 0 && rotationTick % coldSweepEveryNRuns === 0;

  if (isColdSweepRun) {
    summary.coldSweep = true;
    const sweepIndex = Math.floor(rotationTick / coldSweepEveryNRuns);
    const preferCold = sweepIndex % 2 === 0;

    if (preferCold && queueCounts.cold > 0) {
      const coldPages = Math.max(1, Math.ceil(queueCounts.cold / remainingSlots));
      const coldPage = sweepIndex % coldPages;
      const coldFrom = coldPage * remainingSlots;
      const coldTo = coldFrom + remainingSlots - 1;

      const coldRows = await fetchColdNotVerifiedPage(
        supabase,
        cutoffIso,
        coldFrom,
        coldTo,
      );
      summary.subrequestsUsed += 1;
      summary.queueTier = members.length > 0 ? "mixed" : "cold";
      members.push(...coldRows);
      remainingSlots = batchSize - members.length;
    } else if (queueCounts.paused > 0) {
      const pausedPages = Math.max(1, Math.ceil(queueCounts.paused / remainingSlots));
      const pausedPage = sweepIndex % pausedPages;
      const pausedFrom = pausedPage * remainingSlots;
      const pausedTo = pausedFrom + remainingSlots - 1;

      const pausedRows = await fetchPausedNotVerifiedPage(
        supabase,
        pausedFrom,
        pausedTo,
      );
      summary.subrequestsUsed += 1;
      summary.queueTier = members.length > 0 ? "mixed" : "paused-recovery";
      members.push(...pausedRows);
      remainingSlots = batchSize - members.length;
    }
  }

  if (remainingSlots > 0) {
    const { count: verifiedCount, error: verifiedCountError } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "Verified")
      .not("discord_id", "is", null);

    if (verifiedCountError) {
      throw new Error(`Supabase verified count failed: ${verifiedCountError.message}`);
    }
    summary.subrequestsUsed += 1;

    const verifiedTotal = verifiedCount ?? 0;
    if (verifiedTotal > 0) {
      const verifiedPages = Math.max(1, Math.ceil(verifiedTotal / remainingSlots));
      const verifiedPage = rotationTick % verifiedPages;
      const verifiedFrom = verifiedPage * remainingSlots;
      const verifiedTo = verifiedFrom + remainingSlots - 1;

      const { data: verifiedRows, error: verifiedError } = await supabase
        .from("members")
        .select("id, discord_id, status, discord_not_in_guild_strikes, discord_sync_paused_at")
        .eq("status", "Verified")
        .not("discord_id", "is", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(verifiedFrom, verifiedTo);

      if (verifiedError) {
        throw new Error(`Supabase verified query failed: ${verifiedError.message}`);
      }
      summary.subrequestsUsed += 1;

      members.push(
        ...((verifiedRows ?? []) as SyncMemberRow[]).map((row) => ({
          ...row,
          discord_not_in_guild_strikes: row.discord_not_in_guild_strikes ?? 0,
          discord_sync_paused_at: row.discord_sync_paused_at ?? null,
        })),
      );
    }
  }

  const subrequestLimit = WORKERS_FREE_SUBREQUEST_BUDGET - SUBREQUEST_MARGIN;

  for (const member of members) {
    const discordId = member.discord_id?.trim();
    if (!discordId) {
      summary.skipped += 1;
      continue;
    }

    if (summary.subrequestsUsed + 2 > subrequestLimit) {
      summary.deferred += 1;
      continue;
    }

    summary.checked += 1;

    try {
      const roleIds = await fetchGuildMemberRoleIds(
        env.DISCORD_BOT_TOKEN,
        env.DISCORD_GUILD_ID,
        discordId,
      );
      summary.subrequestsUsed += 1;

      const strikeUpdate = buildStrikeUpdate(member, roleIds === null, strikeLimit);
      if (roleIds === null) {
        summary.notInGuild += 1;
      }
      if (strikeUpdate.pausedNow) {
        summary.syncPaused += 1;
      }
      if (strikeUpdate.reset) {
        summary.strikesReset += 1;
      }

      const hasRose = roleIds?.includes(roseRoleId) ?? false;
      const targetStatus: MemberStatus = hasRose ? "Verified" : "Not Verified";
      const statusChanged = member.status !== targetStatus;
      const strikeChanged =
        strikeUpdate.strikes !== member.discord_not_in_guild_strikes ||
        strikeUpdate.clearPause ||
        strikeUpdate.pausedNow;

      if (!statusChanged && !strikeChanged) {
        continue;
      }

      if (summary.subrequestsUsed + 1 > subrequestLimit) {
        summary.deferred += 1;
        console.warn(
          `[discord-sync] Deferred ${discordId} update (subrequest budget)`,
        );
        continue;
      }

      const updatePayload: Record<string, unknown> = {
        discord_not_in_guild_strikes: strikeUpdate.strikes,
        discord_sync_paused_at: strikeUpdate.pausedAt,
      };
      if (statusChanged) {
        updatePayload.status = targetStatus;
      }

      const { error: updateError } = await supabase
        .from("members")
        .update(updatePayload)
        .eq("id", member.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      summary.subrequestsUsed += 1;

      if (statusChanged) {
        summary.updated += 1;
        if (targetStatus === "Verified") {
          summary.verified += 1;
        } else {
          summary.unverified += 1;
        }
      }

      const parts: string[] = [];
      if (statusChanged) {
        parts.push(`${member.status} -> ${targetStatus}`);
      }
      if (strikeUpdate.pausedNow) {
        parts.push(`sync paused (${strikeUpdate.strikes} not-in-guild strikes)`);
      } else if (strikeUpdate.reset) {
        parts.push("guild strikes reset");
      } else if (roleIds === null) {
        parts.push(`not-in-guild strike ${strikeUpdate.strikes}/${strikeLimit}`);
      }

      console.info(
        `[discord-sync] ${discordId}${parts.length > 0 ? ` ${parts.join("; ")}` : ""}`,
      );
    } catch (err) {
      summary.errors += 1;
      console.error(
        `[discord-sync] Failed for ${discordId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return summary;
}
