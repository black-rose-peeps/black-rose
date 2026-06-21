import { supabase } from "@/lib/supabase";
import {
  ADMIN_AUDIT_ACTIONS,
  logAdminAction,
} from "@/features/admin/services/audit-log.service";
import { formatValorantRiotId, isValorantGame } from "@/features/member/utils/valorant-identity";
import type { AdminMember, CreateMemberInput, MemberVerificationStatus } from "../types";
import { resolveMemberProfileSlug } from "@/features/member/utils/profile-slug";
import { isUuid } from "../utils/postgrest-filter";
import { rowToAdminMember } from "../utils";

const MEMBER_SYNC_COLUMNS = "discord_not_in_guild_strikes, discord_sync_paused_at";

const ADMIN_MEMBER_LIST_COLUMNS =
  `id, username, discord_username, discord_id, status, registered_at, created_at, ${MEMBER_SYNC_COLUMNS}, member_profiles(avatar_url, slug, display_name)`;

const ADMIN_MEMBER_DETAIL_COLUMNS =
  `id, username, discord_username, discord_id, status, registered_at, created_at, ${MEMBER_SYNC_COLUMNS}, member_profiles(avatar_url, slug, display_name)`;

const ADMIN_MEMBER_MUTATION_COLUMNS =
  `id, username, discord_username, discord_id, status, registered_at, created_at, ${MEMBER_SYNC_COLUMNS}`;

function throwMemberUniqueViolation(error: { message: string }): never {
  const msg = error.message;
  if (msg.includes("discord_username")) {
    throw new Error("That Discord username is already registered.");
  }
  if (msg.includes("discord_id")) {
    throw new Error("That Discord ID is already linked to another member.");
  }
  if (msg.includes("username")) {
    throw new Error("That username is already registered.");
  }
  throw new Error(msg);
}

export async function fetchMembers(): Promise<AdminMember[]> {
  const { data, error } = await supabase
    .from("members")
    .select(ADMIN_MEMBER_LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToAdminMember);
}

export async function fetchMemberById(id: string): Promise<AdminMember | null> {
  const { data, error } = await supabase
    .from("members")
    .select(ADMIN_MEMBER_DETAIL_COLUMNS)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(error.message);
  }
  return data ? rowToAdminMember(data) : null;
}

export async function createMember(input: CreateMemberInput): Promise<AdminMember> {
  const { data, error } = await supabase
    .from("members")
    .insert({
      username: input.username,
      discord_username: input.discordUsername,
      discord_id: input.discordId ?? null,
      status: input.status,
    })
    .select(ADMIN_MEMBER_MUTATION_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") throwMemberUniqueViolation(error);
    throw new Error(error.message);
  }

  const member = rowToAdminMember(data);
  void logAdminAction({
    action: ADMIN_AUDIT_ACTIONS.MEMBER_CREATED,
    entityType: "member",
    entityId: member.id,
    metadata: { username: member.username, discordUsername: member.discordUsername },
  });

  return member;
}

export async function updateMemberVerificationStatus(
  id: string,
  status: MemberVerificationStatus,
): Promise<AdminMember> {
  const { data, error } = await supabase
    .from("members")
    .update({ status })
    .eq("id", id)
    .select(ADMIN_MEMBER_MUTATION_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  const member = rowToAdminMember(data);

  void logAdminAction({
    action:
      status === "Verified"
        ? ADMIN_AUDIT_ACTIONS.MEMBER_VERIFIED
        : ADMIN_AUDIT_ACTIONS.MEMBER_UNVERIFIED,
    entityType: "member",
    entityId: member.id,
    metadata: { username: member.username, discordUsername: member.discordUsername, status },
  });

  return member;
}

export async function resetMemberDiscordSyncQueue(id: string): Promise<AdminMember> {
  const { data, error } = await supabase
    .from("members")
    .update({
      discord_not_in_guild_strikes: 0,
      discord_sync_paused_at: null,
    })
    .eq("id", id)
    .select(ADMIN_MEMBER_MUTATION_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  const member = rowToAdminMember(data);

  void logAdminAction({
    action: ADMIN_AUDIT_ACTIONS.MEMBER_DISCORD_SYNC_RESET,
    entityType: "member",
    entityId: member.id,
    metadata: { username: member.username, discordUsername: member.discordUsername },
  });

  return member;
}

export async function updateMember(id: string, input: CreateMemberInput): Promise<AdminMember> {
  const { data, error } = await supabase
    .from("members")
    .update({
      username: input.username,
      discord_username: input.discordUsername,
      discord_id: input.discordId ?? null,
      status: input.status,
    })
    .eq("id", id)
    .select(ADMIN_MEMBER_MUTATION_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") throwMemberUniqueViolation(error);
    throw new Error(error.message);
  }

  const member = rowToAdminMember(data);
  void logAdminAction({
    action: ADMIN_AUDIT_ACTIONS.MEMBER_UPDATED,
    entityType: "member",
    entityId: member.id,
    metadata: { username: member.username, discordUsername: member.discordUsername },
  });

  return member;
}

export interface InviteSearchMember {
  id: string;
  username: string;
  discordUsername: string;
  displayName: string;
  avatarInitials: string;
  avatarUrl: string | null;
  profileSlug: string;
}

export interface InviteSearchResult {
  members: InviteSearchMember[];
  total: number;
  page: number;
  pageSize: number;
}

const INVITE_SEARCH_PAGE_SIZE = 8;

export interface InviteSearchOptions {
  page?: number;
  pageSize?: number;
  /** When set, members already on an active team for this game are excluded. */
  game?: string;
  /** Current team id — excluded from the active-game busy check (same roster allowed). */
  excludeTeamId?: string;
}

async function fetchMemberIdsOnActiveGame(game: string, excludeTeamId?: string): Promise<string[]> {
  const { data: teamRows, error: teamErr } = await supabase
    .from("teams")
    .select("id")
    .eq("game", game);

  if (teamErr) throw new Error(teamErr.message);

  const teamIds = (teamRows ?? [])
    .map((row) => row.id as string)
    .filter((teamId) => teamId !== excludeTeamId);

  if (teamIds.length === 0) return [];

  const { data: memberRows, error: memberErr } = await supabase
    .from("team_members")
    .select("user_id")
    .in("team_id", teamIds)
    .in("status", ["captain", "active"]);

  if (memberErr) throw new Error(memberErr.message);

  return [...new Set((memberRows ?? []).map((row) => row.user_id as string))];
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

const INVITE_MEMBER_SELECT =
  "id, username, discord_username, member_profiles(display_name, valorant_game_name, valorant_tagline, avatar_url, slug)";

async function collectInviteSearchMemberIds(query: string, game?: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const ids = new Set<string>();

  const runs = [
    supabase
      .from("members")
      .select("id")
      .eq("status", "Verified")
      .ilike("discord_username", pattern),
    supabase.from("members").select("id").eq("status", "Verified").ilike("username", pattern),
    supabase
      .from("member_profiles")
      .select("member_id, members!inner(status)")
      .ilike("display_name", pattern)
      .eq("members.status", "Verified"),
  ];

  if (game && isValorantGame(game)) {
    runs.push(
      supabase
        .from("member_profiles")
        .select("member_id, members!inner(status)")
        .ilike("valorant_game_name", pattern)
        .eq("members.status", "Verified"),
      supabase
        .from("member_profiles")
        .select("member_id, members!inner(status)")
        .ilike("valorant_tagline", pattern)
        .eq("members.status", "Verified"),
    );

    const hashIdx = trimmed.indexOf("#");
    if (hashIdx > 0) {
      const gameName = trimmed.slice(0, hashIdx).trim();
      const tag = trimmed.slice(hashIdx + 1).trim();
      if (gameName) {
        runs.push(
          supabase
            .from("member_profiles")
            .select("member_id, members!inner(status)")
            .ilike("valorant_game_name", `%${escapeIlikePattern(gameName)}%`)
            .eq("members.status", "Verified"),
        );
      }
      if (tag) {
        runs.push(
          supabase
            .from("member_profiles")
            .select("member_id, members!inner(status)")
            .ilike("valorant_tagline", `%${escapeIlikePattern(tag)}%`)
            .eq("members.status", "Verified"),
        );
      }
    }
  }

  const results = await Promise.all(runs);
  for (const result of results) {
    if (result.error) throw new Error(result.error.message);
    for (const row of result.data ?? []) {
      const record = row as { id?: string; member_id?: string };
      if (record.id) ids.add(record.id);
      if (record.member_id) ids.add(record.member_id);
    }
  }

  return [...ids];
}

function rowToInviteSearchMember(row: Record<string, unknown>, game?: string): InviteSearchMember {
  const username = row.username as string;
  const discordUsername = (row.discord_username as string | null | undefined)?.trim() || username;
  const profiles = row.member_profiles as
    | {
        display_name?: string;
        valorant_game_name?: string | null;
        valorant_tagline?: string | null;
        avatar_url?: string | null;
        slug?: string | null;
      }
    | Array<{
        display_name?: string;
        valorant_game_name?: string | null;
        valorant_tagline?: string | null;
        avatar_url?: string | null;
        slug?: string | null;
      }>
    | null
    | undefined;
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  const baseDisplayName = profile?.display_name?.trim() || username;
  const valorantId =
    profile &&
    formatValorantRiotId(
      profile.valorant_game_name?.trim() ?? "",
      profile.valorant_tagline?.trim() ?? "",
    );
  const displayName = game && isValorantGame(game) && valorantId ? valorantId : baseDisplayName;

  const avatarUrl = profile?.avatar_url?.trim() || null;

  return {
    id: row.id as string,
    username,
    discordUsername,
    displayName,
    avatarInitials: initialsFromName(displayName),
    avatarUrl,
    profileSlug: resolveMemberProfileSlug(profile?.slug, username),
  };
}

/** Search verified members available for team invites (paginated). */
export async function searchVerifiedMembersForInvite(
  query: string,
  excludeIds: string[] = [],
  options?: InviteSearchOptions,
): Promise<InviteSearchResult> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? INVITE_SEARCH_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const rosterExclude = excludeIds.filter(isUuid);
  const gameBusy =
    options?.game != null
      ? await fetchMemberIdsOnActiveGame(options.game, options.excludeTeamId)
      : [];
  const allExclude = new Set([...rosterExclude, ...gameBusy.filter(isUuid)]);

  const trimmed = query.trim();

  if (!trimmed) {
    let builder = supabase
      .from("members")
      .select(INVITE_MEMBER_SELECT, { count: "exact" })
      .eq("status", "Verified")
      .order("username", { ascending: true });

    if (allExclude.size > 0) {
      builder = builder.not("id", "in", `(${[...allExclude].map((id) => `"${id}"`).join(",")})`);
    }

    const { data, error, count } = await builder.range(from, to);
    if (error) throw new Error(error.message);

    return {
      members: (data ?? []).map((row) =>
        rowToInviteSearchMember(row as Record<string, unknown>, options?.game),
      ),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  const matchingIds = (await collectInviteSearchMemberIds(trimmed, options?.game)).filter(
    (id) => !allExclude.has(id),
  );
  const total = matchingIds.length;
  if (total === 0) {
    return { members: [], total: 0, page, pageSize };
  }

  const { data: orderedRows, error: orderError } = await supabase
    .from("members")
    .select("id")
    .in("id", matchingIds)
    .eq("status", "Verified")
    .order("username", { ascending: true });

  if (orderError) throw new Error(orderError.message);

  const orderedIds = (orderedRows ?? []).map((row) => row.id as string);
  const pageIds = orderedIds.slice(from, to + 1);
  if (pageIds.length === 0) {
    return { members: [], total, page, pageSize };
  }

  const { data, error } = await supabase
    .from("members")
    .select(INVITE_MEMBER_SELECT)
    .in("id", pageIds)
    .eq("status", "Verified")
    .order("username", { ascending: true });

  if (error) throw new Error(error.message);

  return {
    members: (data ?? []).map((row) =>
      rowToInviteSearchMember(row as Record<string, unknown>, options?.game),
    ),
    total,
    page,
    pageSize,
  };
}

export async function deleteMember(id: string, options?: { stale?: boolean }): Promise<void> {
  const member = await fetchMemberById(id);

  const { data: onTeam, error: teamErr } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", id)
    .in("status", ["captain", "active"])
    .limit(1);

  if (teamErr) throw new Error(teamErr.message);
  if (onTeam && onTeam.length > 0) {
    throw new Error("Remove this member from their team before deleting.");
  }

  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);

  void logAdminAction({
    action: ADMIN_AUDIT_ACTIONS.MEMBER_DELETED,
    entityType: "member",
    entityId: id,
    metadata: {
      username: member?.username,
      discordUsername: member?.discordUsername,
      stale: options?.stale ?? false,
    },
  });
}
