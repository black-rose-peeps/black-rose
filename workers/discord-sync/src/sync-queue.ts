import type { SupabaseClient } from "@supabase/supabase-js";

export type MemberStatus = "Verified" | "Not Verified";

export interface SyncMemberRow {
  id: string;
  discord_id: string;
  status: MemberStatus;
  discord_not_in_guild_strikes: number;
  discord_sync_paused_at: string | null;
}

export interface NotVerifiedQueueCounts {
  hot: number;
  cold: number;
  paused: number;
  total: number;
}

const MEMBER_SELECT =
  "id, discord_id, status, discord_not_in_guild_strikes, discord_sync_paused_at";

function notVerifiedBase(supabase: SupabaseClient) {
  return supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("status", "Not Verified")
    .not("discord_id", "is", null);
}

export async function countNotVerifiedQueues(
  supabase: SupabaseClient,
  hotCutoffIso: string,
): Promise<NotVerifiedQueueCounts> {
  const [hotResult, coldResult, pausedResult] = await Promise.all([
    notVerifiedBase(supabase)
      .is("discord_sync_paused_at", null)
      .gte("created_at", hotCutoffIso),
    notVerifiedBase(supabase)
      .is("discord_sync_paused_at", null)
      .lt("created_at", hotCutoffIso),
    notVerifiedBase(supabase).not("discord_sync_paused_at", "is", null),
  ]);

  if (hotResult.error) {
    throw new Error(`Supabase hot-queue count failed: ${hotResult.error.message}`);
  }
  if (coldResult.error) {
    throw new Error(`Supabase cold-queue count failed: ${coldResult.error.message}`);
  }
  if (pausedResult.error) {
    throw new Error(`Supabase paused count failed: ${pausedResult.error.message}`);
  }

  const hot = hotResult.count ?? 0;
  const cold = coldResult.count ?? 0;
  const paused = pausedResult.count ?? 0;

  return {
    hot,
    cold,
    paused,
    total: hot + cold + paused,
  };
}

export async function fetchHotNotVerifiedPage(
  supabase: SupabaseClient,
  hotCutoffIso: string,
  from: number,
  to: number,
): Promise<SyncMemberRow[]> {
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_SELECT)
    .eq("status", "Not Verified")
    .not("discord_id", "is", null)
    .is("discord_sync_paused_at", null)
    .gte("created_at", hotCutoffIso)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Supabase hot-queue query failed: ${error.message}`);
  }

  return normalizeMemberRows((data ?? []) as unknown[]);
}

export async function fetchColdNotVerifiedPage(
  supabase: SupabaseClient,
  hotCutoffIso: string,
  from: number,
  to: number,
): Promise<SyncMemberRow[]> {
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_SELECT)
    .eq("status", "Not Verified")
    .not("discord_id", "is", null)
    .is("discord_sync_paused_at", null)
    .lt("created_at", hotCutoffIso)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Supabase cold-queue query failed: ${error.message}`);
  }

  return normalizeMemberRows((data ?? []) as unknown[]);
}

export async function fetchPausedNotVerifiedPage(
  supabase: SupabaseClient,
  from: number,
  to: number,
): Promise<SyncMemberRow[]> {
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_SELECT)
    .eq("status", "Not Verified")
    .not("discord_id", "is", null)
    .not("discord_sync_paused_at", "is", null)
    .order("discord_sync_paused_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Supabase paused-recovery query failed: ${error.message}`);
  }

  return normalizeMemberRows((data ?? []) as unknown[]);
}

function normalizeMemberRows(rows: unknown[] | null): SyncMemberRow[] {
  return (rows ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      discord_id: String(record.discord_id),
      status: record.status as MemberStatus,
      discord_not_in_guild_strikes: Number(record.discord_not_in_guild_strikes ?? 0),
      discord_sync_paused_at:
        (record.discord_sync_paused_at as string | null | undefined) ?? null,
    };
  });
}

export function hotCutoffIso(hotDays: number): string {
  return new Date(Date.now() - hotDays * 24 * 60 * 60 * 1000).toISOString();
}

export function runsPerColdSweep(
  coldSweepIntervalMinutes: number,
  baselineIntervalMinutes: number,
): number {
  return Math.max(1, Math.ceil(coldSweepIntervalMinutes / baselineIntervalMinutes));
}
