import { supabase } from "@/lib/supabase";
import { ADMIN_AUDIT_ACTIONS, logAdminAction } from "@/features/admin/services/audit-log.service";
import { formatValorantRiotId, isValorantGame } from "@/features/member/utils/valorant-identity";
import type { AdminMember, CreateMemberInput, MemberVerificationStatus } from "../types";
import { resolveMemberProfileSlug } from "@/features/member/utils/profile-slug";
import { rowToAdminMember } from "../utils";

const MEMBER_SYNC_COLUMNS = "discord_not_in_guild_strikes, discord_sync_paused_at";

const ADMIN_MEMBER_LIST_COLUMNS = `id, username, discord_username, discord_id, status, registered_at, created_at, ${MEMBER_SYNC_COLUMNS}, member_profiles(avatar_url, slug, display_name)`;

const ADMIN_MEMBER_DETAIL_COLUMNS = `id, username, discord_username, discord_id, status, registered_at, created_at, ${MEMBER_SYNC_COLUMNS}, member_profiles(avatar_url, slug, display_name)`;

const ADMIN_MEMBER_MUTATION_COLUMNS = `id, username, discord_username, discord_id, status, registered_at, created_at, ${MEMBER_SYNC_COLUMNS}`;

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

export async function countMembers(): Promise<number> {
  const { count, error } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countVerifiedMembers(): Promise<number> {
  const { count, error } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("status", "Verified");
  if (error) throw new Error(error.message);
  return count ?? 0;
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

export type InviteMemberAvailability = "available" | "on_roster" | "invited" | "on_other_team";

export interface InviteSearchMember {
  id: string;
  username: string;
  discordUsername: string;
  displayName: string;
  avatarInitials: string;
  avatarUrl: string | null;
  profileSlug: string;
  availability: InviteMemberAvailability;
  busyTeamName?: string;
  busyTeamTag?: string;
}

export interface InviteSearchResult {
  members: InviteSearchMember[];
  total: number;
  page: number;
  pageSize: number;
}

const INVITE_SEARCH_PAGE_SIZE = 8;

export interface InviteSearchTeamRosterRef {
  userId: string;
  status: string;
}

export interface InviteSearchOptions {
  page?: number;
  pageSize?: number;
  game?: string;
  /** Current team id — used to resolve roster vs other-team availability. */
  excludeTeamId?: string;
  /** Current team roster — used to mark on-roster / invited members in results. */
  teamRoster?: InviteSearchTeamRosterRef[];
}

interface OtherTeamMembership {
  teamName: string;
  teamTag: string;
}

async function fetchOtherTeamMembershipForUserIds(
  userIds: string[],
  game: string,
  excludeTeamId?: string,
): Promise<Map<string, OtherTeamMembership>> {
  if (!userIds.length) return new Map();

  const { data: memberRows, error: memberErr } = await supabase
    .from("team_members")
    .select("user_id, team_id")
    .in("user_id", userIds)
    .in("status", ["captain", "active"]);

  if (memberErr) throw new Error(memberErr.message);
  if (!memberRows?.length) return new Map();

  const teamIds = [
    ...new Set(
      memberRows
        .map((row) => row.team_id as string)
        .filter((teamId) => teamId && teamId !== excludeTeamId),
    ),
  ];

  if (!teamIds.length) return new Map();

  const { data: teamRows, error: teamErr } = await supabase
    .from("teams")
    .select("id, name, tag")
    .eq("game", game)
    .in("id", teamIds);

  if (teamErr) throw new Error(teamErr.message);

  const teamsById = new Map<string, OtherTeamMembership>();
  for (const row of teamRows ?? []) {
    teamsById.set(row.id as string, {
      teamName: row.name as string,
      teamTag: row.tag as string,
    });
  }

  const result = new Map<string, OtherTeamMembership>();
  for (const row of memberRows) {
    const userId = row.user_id as string;
    const teamId = row.team_id as string;
    if (result.has(userId)) continue;
    const team = teamsById.get(teamId);
    if (team) result.set(userId, team);
  }
  return result;
}

function resolveInviteAvailability(
  memberId: string,
  teamRoster: InviteSearchTeamRosterRef[] | undefined,
  otherTeams: Map<string, OtherTeamMembership>,
): Pick<InviteSearchMember, "availability" | "busyTeamName" | "busyTeamTag"> {
  const onTeam = teamRoster?.find((member) => member.userId === memberId);
  if (onTeam) {
    if (onTeam.status === "invited") return { availability: "invited" };
    if (onTeam.status === "captain" || onTeam.status === "active") {
      return { availability: "on_roster" };
    }
  }

  const other = otherTeams.get(memberId);
  if (other) {
    return {
      availability: "on_other_team",
      busyTeamName: other.teamName,
      busyTeamTag: other.teamTag,
    };
  }

  return { availability: "available" };
}

async function enrichInviteSearchMembers(
  members: Omit<InviteSearchMember, "availability" | "busyTeamName" | "busyTeamTag">[],
  options?: InviteSearchOptions,
): Promise<InviteSearchMember[]> {
  const otherTeams =
    options?.game != null
      ? await fetchOtherTeamMembershipForUserIds(
          members.map((member) => member.id),
          options.game,
          options.excludeTeamId,
        )
      : new Map<string, OtherTeamMembership>();

  return members.map((member) => ({
    ...member,
    ...resolveInviteAvailability(member.id, options?.teamRoster, otherTeams),
  }));
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

function rowToInviteSearchMember(
  row: Record<string, unknown>,
  game?: string,
): Omit<InviteSearchMember, "availability" | "busyTeamName" | "busyTeamTag"> {
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

/** Search verified members for team invites (paginated). Includes roster/busy members with availability labels. */
export async function searchVerifiedMembersForInvite(
  query: string,
  options?: InviteSearchOptions,
): Promise<InviteSearchResult> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? INVITE_SEARCH_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const trimmed = query.trim();

  if (!trimmed) {
    const { data, error, count } = await supabase
      .from("members")
      .select(INVITE_MEMBER_SELECT, { count: "exact" })
      .eq("status", "Verified")
      .order("username", { ascending: true })
      .range(from, to);

    if (error) throw new Error(error.message);

    const members = await enrichInviteSearchMembers(
      (data ?? []).map((row) =>
        rowToInviteSearchMember(row as Record<string, unknown>, options?.game),
      ),
      options,
    );

    return {
      members,
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  const matchingIds = await collectInviteSearchMemberIds(trimmed, options?.game);
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

  const members = await enrichInviteSearchMembers(
    (data ?? []).map((row) =>
      rowToInviteSearchMember(row as Record<string, unknown>, options?.game),
    ),
    options,
  );

  return {
    members,
    total,
    page,
    pageSize,
  };
}

export async function deleteMember(id: string, options?: { stale?: boolean }): Promise<void> {
  let member: AdminMember | null = null;
  try {
    member = await fetchMemberById(id);
  } catch {
    // Audit metadata is optional; deletion must not depend on a pre-read.
  }

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
