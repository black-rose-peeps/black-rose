import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";
import { getNotInGuildStrikeLimit } from "./env";
import { fetchGuildMemberRoleIds, resolveRoseRoleId } from "./discord";
import { buildStrikeUpdate, type MemberRow } from "./sync-strike";

export interface MemberSyncResult {
  discordId: string;
  previousStatus: "Verified" | "Not Verified";
  status: "Verified" | "Not Verified";
  updated: boolean;
  hasRose: boolean;
  notInGuild: boolean;
  syncPaused: boolean;
}

export async function syncMemberByDiscordId(
  env: Env,
  discordUserId: string,
  options?: { clearSyncState?: boolean },
): Promise<MemberSyncResult> {
  const discordId = discordUserId.trim();
  if (!discordId) {
    throw new Error("Missing discordId.");
  }

  const roseRoleId = await resolveRoseRoleId(env);
  const strikeLimit = getNotInGuildStrikeLimit(env);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: findError } = await supabase
    .from("members")
    .select("id, discord_id, status, discord_not_in_guild_strikes, discord_sync_paused_at")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (findError) {
    throw new Error(`Supabase member lookup failed: ${findError.message}`);
  }
  if (!row) {
    throw new Error(`No member row for Discord id ${discordId}.`);
  }

  const member: MemberRow = {
    id: row.id as string,
    discord_id: row.discord_id as string,
    status: row.status as MemberRow["status"],
    discord_not_in_guild_strikes: options?.clearSyncState
      ? 0
      : Number(row.discord_not_in_guild_strikes ?? 0),
    discord_sync_paused_at: options?.clearSyncState
      ? null
      : (row.discord_sync_paused_at as string | null) ?? null,
  };

  const roleIds = await fetchGuildMemberRoleIds(
    env.DISCORD_BOT_TOKEN,
    env.DISCORD_GUILD_ID,
    discordId,
  );

  const strikeUpdate = buildStrikeUpdate(member, roleIds === null, strikeLimit);
  const hasRose = roleIds?.includes(roseRoleId) ?? false;
  const targetStatus = hasRose ? "Verified" : "Not Verified";
  const statusChanged = member.status !== targetStatus;
  const strikeChanged =
    strikeUpdate.strikes !== member.discord_not_in_guild_strikes ||
    strikeUpdate.clearPause ||
    strikeUpdate.pausedNow;

  if (!statusChanged && !strikeChanged) {
    return {
      discordId,
      previousStatus: member.status,
      status: member.status,
      updated: false,
      hasRose,
      notInGuild: roleIds === null,
      syncPaused: Boolean(strikeUpdate.pausedAt),
    };
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
    throw new Error(`Supabase member update failed: ${updateError.message}`);
  }

  console.info(
    `[discord-sync] member ${discordId}${statusChanged ? ` ${member.status} -> ${targetStatus}` : ""}`,
  );

  return {
    discordId,
    previousStatus: member.status,
    status: targetStatus,
    updated: statusChanged || strikeChanged,
    hasRose,
    notInGuild: roleIds === null,
    syncPaused: Boolean(strikeUpdate.pausedAt),
  };
}
