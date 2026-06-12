import { supabase } from "@/lib/supabase";
import {
  formatValorantRiotId,
  isValorantGame,
} from "@/features/member/utils/valorant-identity";
import type { AdminMember, CreateMemberInput, MemberVerificationStatus } from "../types";
import { escapePostgrestFilterValue, isUuid } from "../utils/postgrest-filter";
import { rowToAdminMember } from "../utils";

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
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToAdminMember);
}

export async function fetchMemberById(id: string): Promise<AdminMember | null> {
  const { data, error } = await supabase.from("members").select("*").eq("id", id).single();

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
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throwMemberUniqueViolation(error);
    throw new Error(error.message);
  }

  return rowToAdminMember(data);
}

export async function updateMemberVerificationStatus(
  id: string,
  status: MemberVerificationStatus,
): Promise<AdminMember> {
  const { data, error } = await supabase
    .from("members")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToAdminMember(data);
}

export async function updateMember(
  id: string,
  input: CreateMemberInput,
): Promise<AdminMember> {
  const { data, error } = await supabase
    .from("members")
    .update({
      username: input.username,
      discord_username: input.discordUsername,
      discord_id: input.discordId ?? null,
      status: input.status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throwMemberUniqueViolation(error);
    throw new Error(error.message);
  }

  return rowToAdminMember(data);
}

export interface InviteSearchMember {
  id: string;
  username: string;
  discordUsername: string;
  displayName: string;
  avatarInitials: string;
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

async function fetchMemberIdsOnActiveGame(
  game: string,
  excludeTeamId?: string,
): Promise<string[]> {
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

function rowToInviteSearchMember(
  row: Record<string, unknown>,
  game?: string,
): InviteSearchMember {
  const username = row.username as string;
  const discordUsername =
    (row.discord_username as string | null | undefined)?.trim() || username;
  const profiles = row.member_profiles as
    | {
        display_name?: string;
        valorant_game_name?: string | null;
        valorant_tagline?: string | null;
      }
    | Array<{
        display_name?: string;
        valorant_game_name?: string | null;
        valorant_tagline?: string | null;
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
  const displayName =
    game && isValorantGame(game) && valorantId ? valorantId : baseDisplayName;

  return {
    id: row.id as string,
    username,
    discordUsername,
    displayName,
    avatarInitials: initialsFromName(displayName),
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

  let builder = supabase
    .from("members")
    .select(
      "id, username, discord_username, member_profiles(display_name, valorant_game_name, valorant_tagline)",
      { count: "exact" },
    )
    .eq("status", "Verified")
    .order("username", { ascending: true });

  const trimmed = query.trim();
  if (trimmed) {
    const token = escapePostgrestFilterValue(trimmed);
    builder = builder.or(`username.ilike."%${token}%",discord_username.ilike."%${token}%"`);
  }

  const rosterExclude = excludeIds.filter(isUuid);
  const gameBusy =
    options?.game != null
      ? await fetchMemberIdsOnActiveGame(options.game, options.excludeTeamId)
      : [];
  const allExclude = [...new Set([...rosterExclude, ...gameBusy.filter(isUuid)])];

  if (allExclude.length > 0) {
    builder = builder.not("id", "in", `(${allExclude.map((id) => `"${id}"`).join(",")})`);
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

export async function deleteMember(id: string): Promise<void> {
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
}
