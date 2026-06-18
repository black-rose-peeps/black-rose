import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";
import {
  getBaselineIntervalMinutes,
  getMaxMembersPerRun,
  SUBREQUEST_MARGIN,
  WORKERS_FREE_SUBREQUEST_BUDGET,
} from "./env";
import { fetchGuildMemberRoleIds, resolveRoseRoleId } from "./discord";

type MemberStatus = "Verified" | "Not Verified";

interface MemberRow {
  id: string;
  discord_id: string;
  status: MemberStatus;
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
  notVerifiedQueued: number;
}

export async function syncRoseRoles(env: Env): Promise<SyncSummary> {
  const batchSize = getMaxMembersPerRun(env);
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
  };

  const roseRoleId = await resolveRoseRoleId(env);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rotationMs = getBaselineIntervalMinutes(env) * 60 * 1000;
  const rotationTick = Math.floor(Date.now() / rotationMs);

  const { count: notVerifiedCount, error: notVerifiedCountError } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("status", "Not Verified")
    .not("discord_id", "is", null);

  if (notVerifiedCountError) {
    throw new Error(`Supabase not-verified count failed: ${notVerifiedCountError.message}`);
  }
  summary.subrequestsUsed += 1;

  summary.notVerifiedQueued = notVerifiedCount ?? 0;
  const notVerifiedPages = Math.max(1, Math.ceil(summary.notVerifiedQueued / batchSize));
  const notVerifiedPage = rotationTick % notVerifiedPages;
  const notVerifiedFrom = notVerifiedPage * batchSize;
  const notVerifiedTo = notVerifiedFrom + batchSize - 1;

  summary.page = notVerifiedPage;
  summary.totalPages = notVerifiedPages;

  const { data: notVerifiedRows, error: notVerifiedError } = await supabase
    .from("members")
    .select("id, discord_id, status")
    .eq("status", "Not Verified")
    .not("discord_id", "is", null)
    .order("created_at", { ascending: false })
    .range(notVerifiedFrom, notVerifiedTo);

  if (notVerifiedError) {
    throw new Error(`Supabase not-verified query failed: ${notVerifiedError.message}`);
  }
  summary.subrequestsUsed += 1;

  const members: MemberRow[] = [...((notVerifiedRows ?? []) as MemberRow[])];
  const remainingSlots = batchSize - members.length;

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
        .select("id, discord_id, status")
        .eq("status", "Verified")
        .not("discord_id", "is", null)
        .order("created_at", { ascending: false })
        .range(verifiedFrom, verifiedTo);

      if (verifiedError) {
        throw new Error(`Supabase verified query failed: ${verifiedError.message}`);
      }
      summary.subrequestsUsed += 1;

      members.push(...((verifiedRows ?? []) as MemberRow[]));
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

      if (roleIds === null) {
        summary.notInGuild += 1;
      }

      const hasRose = roleIds?.includes(roseRoleId) ?? false;
      const targetStatus: MemberStatus = hasRose ? "Verified" : "Not Verified";

      if (member.status === targetStatus) {
        continue;
      }

      if (summary.subrequestsUsed + 1 > subrequestLimit) {
        summary.deferred += 1;
        console.warn(
          `[discord-sync] Deferred ${discordId} status update (subrequest budget)`,
        );
        continue;
      }

      const { error: updateError } = await supabase
        .from("members")
        .update({ status: targetStatus })
        .eq("id", member.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      summary.subrequestsUsed += 1;
      summary.updated += 1;
      if (targetStatus === "Verified") {
        summary.verified += 1;
      } else {
        summary.unverified += 1;
      }

      console.info(
        `[discord-sync] ${discordId} ${member.status} -> ${targetStatus}${
          roleIds === null ? " (not in guild)" : ""
        }`,
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
