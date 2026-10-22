import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  applyDiscordGameMembership,
  assertDiscordGameMembershipRuntime,
} from "./discord-game-membership.server";
import {
  assertTrustedOrigin,
  requireAdminSession,
  requireMemberSession,
  requireVerifiedMemberSession,
} from "@/features/auth/server/trusted-session.server";
import { invalidateMemberProfileCache } from "@/features/member/server/profile.server";
import {
  legacyGameKeys,
  memberTransition,
  parseAdminMembershipInput,
  parseGameRosterInput,
  parseMemberAction,
  parseSaveGameProfileInput,
  requireUuid,
  validateGameProfile,
} from "../rules";
import type {
  GameMembership,
  GameMembershipStatus,
  GameRosterEntry,
  GameRosterInput,
  MemberGameProfile,
  MemberGameWorkspace,
  MemberMembershipAction,
  MembershipGame,
  SaveGameProfileInput,
} from "../types";

type Row = Record<string, unknown>;
type ReadResult = { data: unknown[] | null; error: { message: string } | null };
const PROFILE_COLUMNS =
  "member_id, game_id, ign, role_id, role_label, class_name, server_name, faction, updated_at";
const MEMBERSHIP_COLUMNS = "member_id, game_id, status, updated_at";
function row(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}
function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function profileFromRow(data: Row): MemberGameProfile {
  return {
    memberId: string(data.member_id),
    gameId: string(data.game_id),
    ign: string(data.ign),
    roleId: typeof data.role_id === "string" ? data.role_id : null,
    roleLabel: string(data.role_label),
    className: string(data.class_name),
    serverName: string(data.server_name),
    faction: string(data.faction),
    updatedAt: string(data.updated_at),
  };
}
function membershipFromRow(data: Row): GameMembership {
  return {
    memberId: string(data.member_id),
    gameId: string(data.game_id),
    status: data.status as GameMembershipStatus,
    updatedAt: string(data.updated_at),
  };
}
function gameFromRow(data: Row): MembershipGame {
  const { game_roles, ...game } = data;
  return {
    ...game,
    roles: Array.isArray(game_roles) ? game_roles : [],
  } as unknown as MembershipGame;
}
function rpcRow(data: unknown): Row {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object")
    throw new Error("The database did not return the saved record.");
  return value as Row;
}
async function allRows(
  load: (from: number, to: number) => PromiseLike<ReadResult>,
): Promise<Row[]> {
  const results: Row[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await load(from, from + 499);
    if (error) throw new Error(error.message);
    if (!data?.length) return results;
    results.push(...data.map(row));
    from += data.length;
  }
}
async function loadGame(gameId: string): Promise<MembershipGame> {
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("*, game_roles(*)")
    .eq("id", gameId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Game not found.");
  return gameFromRow(row(data));
}
async function loadMemberState(memberId: string, gameId: string) {
  const client = getSupabaseAdmin();
  const [profile, membership] = await Promise.all([
    client
      .from("member_game_profiles")
      .select(PROFILE_COLUMNS)
      .eq("member_id", memberId)
      .eq("game_id", gameId)
      .maybeSingle(),
    client
      .from("game_memberships")
      .select(MEMBERSHIP_COLUMNS)
      .eq("member_id", memberId)
      .eq("game_id", gameId)
      .maybeSingle(),
  ]);
  if (profile.error) throw new Error(profile.error.message);
  if (membership.error) throw new Error(membership.error.message);
  return {
    profile: profile.data ? profileFromRow(row(profile.data)) : null,
    membership: membership.data ? membershipFromRow(row(membership.data)) : null,
  };
}
export async function fetchMyGameWorkspace(): Promise<MemberGameWorkspace> {
  const { memberId } = await requireMemberSession();
  const client = getSupabaseAdmin();
  const [games, profiles, memberships, legacyResult] = await Promise.all([
    allRows((from, to) =>
      client
        .from("games")
        .select("*, game_roles(*)")
        .order("sort_order")
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      client
        .from("member_game_profiles")
        .select(PROFILE_COLUMNS)
        .eq("member_id", memberId)
        .order("game_id")
        .range(from, to),
    ),
    allRows((from, to) =>
      client
        .from("game_memberships")
        .select(MEMBERSHIP_COLUMNS)
        .eq("member_id", memberId)
        .order("game_id")
        .range(from, to),
    ),
    client
      .from("member_profiles")
      .select(
        "main_game, main_role, valorant_game_name, valorant_tagline, game_identities, ingame_display_name",
      )
      .eq("member_id", memberId)
      .maybeSingle(),
  ]);
  if (legacyResult.error) throw new Error(legacyResult.error.message);
  const legacy = row(legacyResult.data);
  const identities = Object.fromEntries(
    Object.entries(row(legacy.game_identities)).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  return {
    games: games.map(gameFromRow),
    profiles: profiles.map(profileFromRow),
    memberships: memberships.map(membershipFromRow),
    legacy: {
      mainGame: string(legacy.main_game),
      mainRole: string(legacy.main_role),
      valorantGameName: string(legacy.valorant_game_name),
      valorantTagline: string(legacy.valorant_tagline),
      gameIdentities: identities,
      ingameDisplayName: string(legacy.ingame_display_name),
    },
  };
}
export async function saveMyGameProfile(value: SaveGameProfileInput): Promise<MemberGameProfile> {
  assertTrustedOrigin();
  const { memberId } = await requireVerifiedMemberSession();
  const input = parseSaveGameProfileInput(value);
  const [game, previous] = await Promise.all([
    loadGame(input.gameId),
    loadMemberState(memberId, input.gameId),
  ]);
  const valid = validateGameProfile(
    input,
    game,
    previous.profile,
    previous.membership?.status ?? null,
  );
  const { data, error } = await getSupabaseAdmin().rpc("save_member_game_profile", {
    p_member_id: memberId,
    p_game_id: valid.gameId,
    p_ign: valid.ign,
    p_role_id: valid.roleId,
    p_class_name: valid.className,
    p_server_name: valid.serverName,
    p_faction: valid.faction,
    p_legacy_keys: legacyGameKeys(game),
  });
  if (error) throw new Error(error.message);
  invalidateMemberProfileCache(memberId);
  return profileFromRow(rpcRow(data));
}
export async function changeMyMainGame(value: { gameId: string | null }): Promise<void> {
  assertTrustedOrigin();
  const { memberId } = await requireVerifiedMemberSession();
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Main Game input.");
  if (Object.keys(value).some((key) => key !== "gameId"))
    throw new Error("Unexpected Main Game input field.");
  const gameId = value.gameId === null ? null : requireUuid(value.gameId, "gameId");
  if (gameId !== null) {
    const game = await loadGame(gameId);
    if (!game.is_active)
      throw new Error("This game is inactive; choose an active game or clear Main Game.");
  }
  const { error } = await getSupabaseAdmin().rpc("set_member_main_game", {
    p_member_id: memberId,
    p_game_id: gameId,
  });
  if (error) throw new Error(error.message);
  invalidateMemberProfileCache(memberId);
}
export async function changeMyGameMembership(value: {
  gameId: string;
  action: MemberMembershipAction;
}): Promise<GameMembership> {
  assertTrustedOrigin();
  const discordEnabled = assertDiscordGameMembershipRuntime();
  const { memberId } = await requireVerifiedMemberSession();
  const input = parseMemberAction(value);
  if (discordEnabled && input.action === "apply")
    return membershipFromRow(await applyDiscordGameMembership(memberId, input.gameId));
  const [game, previous] = await Promise.all([
    loadGame(input.gameId),
    loadMemberState(memberId, input.gameId),
  ]);
  memberTransition(
    previous.membership?.status ?? null,
    input.action,
    !!previous.profile?.ign.trim(),
    game.is_active,
  );
  const { data, error } = await getSupabaseAdmin().rpc("change_game_membership", {
    p_member_id: memberId,
    p_game_id: input.gameId,
    p_action: input.action,
    p_actor_type: "member",
    p_actor_id: memberId,
    p_admin_status: null,
    p_reason: null,
  });
  if (error) throw new Error(error.message);
  return membershipFromRow(rpcRow(data));
}
export async function changeGameMembershipAsAdmin(value: {
  memberId: string;
  gameId: string;
  status: GameMembershipStatus;
  reason?: string;
}): Promise<GameMembership> {
  assertTrustedOrigin();
  const actor = await requireAdminSession();
  const input = parseAdminMembershipInput(value);
  const [game, previous] = await Promise.all([
    loadGame(input.gameId),
    loadMemberState(input.memberId, input.gameId),
  ]);
  if (!game.is_active && input.status !== "inactive" && input.status !== "left")
    throw new Error("Inactive games only allow marking membership inactive or left.");
  if ((input.status === "accepted" || input.status === "applying") && !previous.profile?.ign.trim())
    throw new Error("The member must save a game profile with an IGN first.");
  const { data, error } = await getSupabaseAdmin().rpc("change_game_membership", {
    p_member_id: input.memberId,
    p_game_id: input.gameId,
    p_action: "set_status",
    p_actor_type: "admin",
    p_actor_id: actor.adminId,
    p_admin_status: input.status,
    p_reason: input.reason ?? null,
  });
  if (error) throw new Error(error.message);
  return membershipFromRow(rpcRow(data));
}
export async function fetchGameRoster(value: GameRosterInput): Promise<GameRosterEntry[]> {
  await requireAdminSession();
  const input = parseGameRosterInput(value);
  await loadGame(input.gameId);
  const client = getSupabaseAdmin();
  const [profileRows, membershipRows] = await Promise.all([
    allRows((from, to) =>
      client
        .from("member_game_profiles")
        .select(PROFILE_COLUMNS)
        .eq("game_id", input.gameId)
        .order("member_id")
        .range(from, to),
    ),
    allRows((from, to) =>
      client
        .from("game_memberships")
        .select(MEMBERSHIP_COLUMNS)
        .eq("game_id", input.gameId)
        .order("member_id")
        .range(from, to),
    ),
  ]);
  const profiles = new Map(
    profileRows.map((data) => {
      const profile = profileFromRow(data);
      return [profile.memberId, profile] as const;
    }),
  );
  const memberships = new Map(
    membershipRows.map((data) => {
      const membership = membershipFromRow(data);
      return [membership.memberId, membership] as const;
    }),
  );
  const ids = [...new Set([...profiles.keys(), ...memberships.keys()])];
  const result: GameRosterEntry[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const members = await allRows((from, to) =>
      client
        .from("members")
        .select("id, username, discord_username, status, member_profiles(display_name, main_game)")
        .in("id", ids.slice(offset, offset + 100))
        .order("id")
        .range(from, to),
    );
    for (const member of members) {
      const memberId = string(member.id);
      const profile = profiles.get(memberId) ?? null;
      const membership = memberships.get(memberId) ?? null;
      if (input.status && membership?.status !== input.status) continue;
      if (input.roleId && profile?.roleId !== input.roleId) continue;
      if (input.className && profile?.className !== input.className) continue;
      if (input.serverName && profile?.serverName !== input.serverName) continue;
      if (input.faction && profile?.faction !== input.faction) continue;
      const joined = Array.isArray(member.member_profiles)
        ? row(member.member_profiles[0])
        : row(member.member_profiles);
      result.push({
        memberId,
        displayName: string(joined.display_name) || string(member.username),
        discordUsername: string(member.discord_username),
        mainGame: string(joined.main_game),
        verificationStatus: string(member.status),
        profile,
        membership,
      });
    }
  }
  return result.sort(
    (a, b) => a.displayName.localeCompare(b.displayName) || a.memberId.localeCompare(b.memberId),
  );
}
