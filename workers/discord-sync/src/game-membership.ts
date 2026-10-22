import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";
import { SUBREQUEST_MARGIN, WORKERS_FREE_SUBREQUEST_BUDGET } from "./env";
import {
  assertDiscordGameMembershipTarget,
  createDiscordRoleProofReader,
  isDiscordGameMembershipEnabled,
  type DiscordRoleObservation,
} from "../../../src/features/game-membership/discord-role-proof";

export function assertGameMembershipTargetIfEnabled(env: Env): void {
  if (!isDiscordGameMembershipEnabled(env.DISCORD_GAME_MEMBERSHIP_ENABLED)) return;
  assertDiscordGameMembershipTarget({
    supabaseUrl: env.SUPABASE_URL,
    expectedProjectRef: env.DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF,
    guildId: env.DISCORD_GUILD_ID,
  });
}

/** Queue + initial metadata + eight members + fresh metadata confirmation + batch. */
export const GAME_MEMBERSHIP_RESERVED_REQUESTS = 12;

/** Charge before every actual fetch, including failures and SDK retries. */
export class SubrequestBudget {
  used = 0;
  readonly limit = WORKERS_FREE_SUBREQUEST_BUDGET - SUBREQUEST_MARGIN;
  take(limit = this.limit): void {
    if (this.used >= Math.min(limit, this.limit)) throw new Error("Subrequest budget exhausted");
    this.used++;
  }
  fetch(limit = this.limit): typeof fetch {
    return (input, init) => {
      this.take(limit);
      return fetch(input, { ...init, redirect: "error" });
    };
  }
}

export interface GameMembershipSyncSummary {
  enabled: boolean;
  dryRun: boolean;
  checked: number;
  errors: number;
  deferred: number;
  changed: number;
  accepted: number;
  inactivated: number;
  skipped: number;
  subrequestsUsed: number;
}

export async function syncGameMemberships(
  env: Env,
  options: { dryRun?: boolean; budget?: SubrequestBudget; tick?: number } = {},
): Promise<GameMembershipSyncSummary> {
  const summary: GameMembershipSyncSummary = {
    enabled: isDiscordGameMembershipEnabled(env.DISCORD_GAME_MEMBERSHIP_ENABLED),
    dryRun: options.dryRun !== false,
    checked: 0,
    errors: 0,
    deferred: 0,
    changed: 0,
    accepted: 0,
    inactivated: 0,
    skipped: 0,
    subrequestsUsed: 0,
  };
  if (!summary.enabled) return summary;
  assertGameMembershipTargetIfEnabled(env);
  const budget = options.budget ?? new SubrequestBudget();
  const before = budget.used;
  const configured = Number(env.DISCORD_GAME_MEMBERSHIP_BATCH_SIZE ?? "8");
  const batchSize = Math.min(
    Number.isInteger(configured) && configured > 0 ? configured : 8,
    8,
    Math.max(0, budget.limit - budget.used - 4),
  );
  if (batchSize < 1) {
    summary.deferred = 1;
    return summary;
  }
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: budget.fetch() },
  });
  try {
    const { data, error } = await supabase.rpc("get_discord_game_membership_sync_batch", {
      p_guild_id: env.DISCORD_GUILD_ID,
      p_limit: batchSize,
      p_tick: options.tick ?? Math.floor(Date.now() / (15 * 60 * 1000)),
    });
    if (error) throw new Error(`Game membership queue failed: ${error.message}`);
    if (!data || !Array.isArray(data.members)) throw new Error("Malformed game membership queue");
    let proofRequestLimit = budget.limit - 2;
    const reader = createDiscordRoleProofReader({
      token: env.DISCORD_BOT_TOKEN,
      guildId: env.DISCORD_GUILD_ID,
      onRequest: () => budget.take(proofRequestLimit), // reserve confirmation + reconcile
    });
    const observations: DiscordRoleObservation[] = [];
    const seen = new Set<string>();
    for (const member of data.members.slice(0, batchSize)) {
      if (
        !member ||
        typeof member.discord_id !== "string" ||
        !/^\d{17,20}$/.test(member.discord_id)
      ) {
        summary.errors++;
        continue;
      }
      if (seen.has(member.discord_id)) continue;
      seen.add(member.discord_id);
      try {
        observations.push(await reader.read(member.discord_id));
        summary.checked++;
      } catch {
        // Failed/malformed proofs are never role absence; stop on errors/429s.
        summary.errors++;
        summary.deferred += Math.max(0, Math.min(data.members.length, batchSize) - seen.size);
        break;
      }
    }
    if (observations.length > 0) {
      // Force an uncached mapping check immediately before the sole batch write.
      proofRequestLimit = budget.limit - 1;
      await reader.confirmMappings();
      const { data: result, error: reconcileError } = await supabase.rpc(
        "reconcile_discord_game_memberships",
        {
          p_guild_id: env.DISCORD_GUILD_ID,
          p_observations: observations,
          p_apply_member_id: null,
          p_apply_game_id: null,
          p_dry_run: summary.dryRun,
        },
      );
      if (reconcileError)
        throw new Error(`Game membership reconcile failed: ${reconcileError.message}`);
      for (const key of ["changed", "accepted", "inactivated", "skipped"] as const) {
        summary[key] = typeof result?.[key] === "number" ? result[key] : 0;
      }
    }
  } finally {
    summary.subrequestsUsed = budget.used - before;
  }
  return summary;
}
