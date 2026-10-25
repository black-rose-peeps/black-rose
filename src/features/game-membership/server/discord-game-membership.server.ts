import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  assertDiscordGameMembershipTarget,
  createDiscordRoleProofReader,
  DiscordRoleProofError,
  isDiscordGameMembershipEnabled,
  type DiscordRoleObservation,
} from "../discord-role-proof";

function configuration() {
  if (!isDiscordGameMembershipEnabled(process.env.DISCORD_GAME_MEMBERSHIP_ENABLED)) return null;
  const projectRef = process.env.DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF;
  const guildId = process.env.DISCORD_GUILD_ID;
  assertDiscordGameMembershipTarget({
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    expectedProjectRef: projectRef,
    guildId,
  });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("Discord membership bot token is not configured.");
  return { projectRef: projectRef!, guildId: guildId!, token };
}

/** Call before session/database access when the feature is enabled. */
export function assertDiscordGameMembershipRuntime(): boolean {
  return configuration() !== null;
}
let cachedReader: ReturnType<typeof createDiscordRoleProofReader> | null = null;
let cachedToken: string | null = null;
let cachedGuild: string | null = null;
function reader(config: NonNullable<ReturnType<typeof configuration>>) {
  if (!cachedReader || cachedToken !== config.token || cachedGuild !== config.guildId) {
    cachedReader = createDiscordRoleProofReader({ token: config.token, guildId: config.guildId });
    cachedToken = config.token;
    cachedGuild = config.guildId;
  }
  return cachedReader;
}
const applying = new Map<string, Promise<Record<string, unknown>>>();
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** One indexed owner/profile join and one RPC; SQL rechecks every invariant atomically. */
export async function applyDiscordGameMembership(
  memberId: string,
  gameId: string,
): Promise<Record<string, unknown>> {
  const config = configuration();
  if (!config) throw new Error("Discord membership automation is disabled.");
  const key = `${config.projectRef}:${memberId}:${gameId}`;
  const previous = applying.get(key);
  if (previous) return previous;
  const task = (async () => {
    const client = getSupabaseAdmin();
    const { data: profile, error: lookupError } = await client
      .from("member_game_profiles")
      .select("ign, members!inner(discord_id), games!inner(is_active)")
      .eq("member_id", memberId)
      .eq("game_id", gameId)
      .maybeSingle();
    if (lookupError) throw new Error("Could not load your saved game profile.");
    const savedProfile = record(profile);
    const related = (value: unknown) => record(Array.isArray(value) ? value[0] : value);
    const member = related(savedProfile.members);
    const game = related(savedProfile.games);
    if (
      typeof savedProfile.ign !== "string" ||
      !savedProfile.ign.trim() ||
      savedProfile.ign.length > 160 ||
      Array.from(savedProfile.ign).some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029;
      })
    )
      throw new Error("Save a valid nonblank IGN before applying.");
    if (game.is_active !== true) throw new Error("This game is inactive.");
    if (typeof member.discord_id !== "string" || !/^\d{17,20}$/.test(member.discord_id))
      throw new Error("Please sign in with Discord again before applying.");
    let observations: DiscordRoleObservation[] = [];
    try {
      const check = reader(config);
      const observation = await check.read(member.discord_id);
      await check.confirmMappings();
      observations = [observation];
    } catch (error) {
      if (!(error instanceof DiscordRoleProofError)) throw error;
      // An unavailable proof is never role absence/acceptance. Persist the normal application.
      console.warn(
        "[game-membership] Discord proof unavailable; retaining manual application review.",
      );
    }
    const { data, error } = await client.rpc("reconcile_discord_game_memberships", {
      p_guild_id: config.guildId,
      p_observations: observations,
      p_apply_member_id: memberId,
      p_apply_game_id: gameId,
      p_dry_run: false,
    });
    if (error) throw new Error(error.message);
    const saved = record(record(data).applied);
    if (
      saved.member_id !== memberId ||
      saved.game_id !== gameId ||
      !["applying", "accepted"].includes(String(saved.status))
    )
      throw new Error("The database did not return the applied game membership.");
    return saved;
  })();
  applying.set(key, task);
  try {
    return await task;
  } finally {
    applying.delete(key);
  }
}

/** Gateway events are hints: fetch current roles instead of trusting event order/payload. */
export async function syncDiscordGameMembershipByDiscordId(discordId: string): Promise<unknown> {
  const config = configuration();
  if (!config) return { changed: 0, skipped: 0 };
  const check = reader(config);
  const observation = await check.read(discordId);
  await check.confirmMappings();
  const { data, error } = await getSupabaseAdmin().rpc("reconcile_discord_game_memberships", {
    p_guild_id: config.guildId,
    p_observations: [observation],
    p_apply_member_id: null,
    p_apply_game_id: null,
    p_dry_run: false,
  });
  if (error) throw new Error(error.message);
  return data;
}
