import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";
import {
  getMaxMembersPerRun,
  SUBREQUEST_MARGIN,
  SUBREQUEST_STARTUP_COST,
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
}

const CRON_INTERVAL_MS = 2 * 60 * 1000;

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
    subrequestsUsed: SUBREQUEST_STARTUP_COST,
    page: 0,
    totalPages: 1,
    batchSize,
  };

  const roseRoleId = await resolveRoseRoleId(env);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error: countError } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .not("discord_id", "is", null);

  if (countError) {
    throw new Error(`Supabase members count failed: ${countError.message}`);
  }

  const totalMembers = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMembers / batchSize));
  const page = Math.floor(Date.now() / CRON_INTERVAL_MS) % totalPages;
  const from = page * batchSize;
  const to = from + batchSize - 1;

  summary.page = page;
  summary.totalPages = totalPages;

  const { data, error } = await supabase
    .from("members")
    .select("id, discord_id, status")
    .not("discord_id", "is", null)
    .order("status", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Supabase members query failed: ${error.message}`);
  }

  const members = (data ?? []) as MemberRow[];
  const subrequestLimit = WORKERS_FREE_SUBREQUEST_BUDGET - SUBREQUEST_MARGIN;

  for (const member of members) {
    const discordId = member.discord_id?.trim();
    if (!discordId) {
      summary.skipped += 1;
      continue;
    }

    // Reserve room for Discord fetch + possible Supabase update.
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
