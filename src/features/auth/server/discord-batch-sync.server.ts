/**
 * One-off REST catch-up sync for admin "Sync Discord now".
 * Primary production path is the Gateway bot (GUILD_MEMBER_UPDATE).
 */

import { isDiscordRoleSyncConfigured } from "./discord-config.server";
import { memberHasRoseRole } from "./discord-guild.server";
import { applyVerificationByDiscordId } from "./discord-verification.server";

const DEFAULT_BATCH_SIZE = 25;

export interface DiscordBatchSyncSummary {
  checked: number;
  updated: number;
  verified: number;
  unverified: number;
  notVerifiedQueued: number;
  errors: number;
  priorityNotVerified: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check newest Not Verified members via Discord REST (admin catch-up). */
export async function runDiscordRoleCatchUpSync(
  options?: { batchSize?: number },
): Promise<DiscordBatchSyncSummary> {
  if (!isDiscordRoleSyncConfigured()) {
    throw new Error(
      "Discord bot is not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID on the server.",
    );
  }

  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const summary: DiscordBatchSyncSummary = {
    checked: 0,
    updated: 0,
    verified: 0,
    unverified: 0,
    notVerifiedQueued: 0,
    errors: 0,
    priorityNotVerified: true,
  };

  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const supabase = getSupabaseAdmin();

  const { count, error: countError } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("status", "Not Verified")
    .not("discord_id", "is", null);

  if (countError) {
    throw new Error(`Supabase count failed: ${countError.message}`);
  }

  summary.notVerifiedQueued = count ?? 0;

  const { data: rows, error: queryError } = await supabase
    .from("members")
    .select("id, discord_id, status")
    .eq("status", "Not Verified")
    .not("discord_id", "is", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(batchSize);

  if (queryError) {
    throw new Error(`Supabase query failed: ${queryError.message}`);
  }

  for (const row of rows ?? []) {
    const discordId = row.discord_id?.trim();
    if (!discordId) continue;

    summary.checked += 1;

    try {
      const hasRose = await memberHasRoseRole(discordId);
      const targetVerified = hasRose;

      if (row.status === (targetVerified ? "Verified" : "Not Verified")) {
        continue;
      }

      const result = await applyVerificationByDiscordId(discordId, targetVerified);
      if (!result.updated) continue;

      summary.updated += 1;
      if (targetVerified) {
        summary.verified += 1;
      } else {
        summary.unverified += 1;
      }

      // Gentle pacing — shared bot token with Gateway bot on same guild.
      await sleep(150);
    } catch (err) {
      summary.errors += 1;
      console.error(
        "[discord-batch-sync] Failed for",
        discordId,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return summary;
}
