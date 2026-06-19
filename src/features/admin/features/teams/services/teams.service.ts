import { supabase } from "@/lib/supabase";
import { deleteTeamAdminFn } from "../functions/delete-team.functions";
import { deleteTeamCaptainFn } from "../functions/delete-team-captain.functions";
import { transferTeamCaptainFn } from "../functions/transfer-team-captain.functions";
import { leaveTeamFn } from "../functions/leave-team.functions";
import { MAX_TEAM_SIZE, resolveRoleForGame } from "@/features/teams/constants";
import type { Team, TeamMember, TeamMemberRole } from "@/features/teams/types";
import type { AddTeamMemberInput, CreateTeamInput } from "../types";
import { formatValorantRiotId, isValorantGame } from "@/features/member/utils/valorant-identity";
import { resolveMemberProfileSlug } from "@/features/member/utils/profile-slug";
import { adminMemberToTeamMember } from "../utils";
import { fetchMemberById } from "@/features/admin/features/members/services/members.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface MemberProfileSnapshot {
  displayName: string;
  valorantGameName: string;
  valorantTagline: string;
  avatarUrl: string | null;
  slug: string;
}

async function fetchMemberProfileSnapshots(
  memberIds: string[],
): Promise<Map<string, MemberProfileSnapshot>> {
  const unique = [...new Set(memberIds.filter(Boolean))];
  if (!unique.length) return new Map();

  const { data, error } = await supabase
    .from("member_profiles")
    .select("member_id, display_name, valorant_game_name, valorant_tagline, avatar_url, slug")
    .in("member_id", unique);

  if (error) {
    console.error("[teams] profile snapshot lookup failed:", error.message);
    return new Map();
  }

  return new Map(
    (data ?? []).map((row) => [
      row.member_id as string,
      {
        displayName: (row.display_name as string | null)?.trim() ?? "",
        valorantGameName: (row.valorant_game_name as string | null)?.trim() ?? "",
        valorantTagline: (row.valorant_tagline as string | null)?.trim() ?? "",
        avatarUrl: (row.avatar_url as string | null)?.trim() || null,
        slug: (row.slug as string | null)?.trim() ?? "",
      },
    ]),
  );
}

async function fetchDiscordUsernames(memberIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(memberIds.filter(Boolean))];
  if (!unique.length) return new Map();

  const { data, error } = await supabase
    .from("members")
    .select("id, username, discord_username")
    .in("id", unique);

  if (error) {
    console.error("[teams] discord username lookup failed:", error.message);
    return new Map();
  }

  return new Map(
    (data ?? []).map((row) => {
      const id = row.id as string;
      const username = row.username as string;
      const discord =
        (row.discord_username as string | null | undefined)?.trim() || username;
      return [id, discord];
    }),
  );
}

function rowToTeamMember(
  row: Record<string, unknown>,
  snapshots: Map<string, MemberProfileSnapshot>,
  discordUsernames: Map<string, string>,
  teamGame: Team["game"],
): TeamMember {
  const userId = row.user_id as string;
  const username = row.username as string;
  const snapshot = snapshots.get(userId);
  const snapshotDisplay = (row.display_name as string)?.trim();
  const baseDisplayName = snapshot?.displayName || snapshotDisplay || username;
  const valorantId = snapshot
    ? formatValorantRiotId(snapshot.valorantGameName, snapshot.valorantTagline)
    : null;
  const useValorantId = isValorantGame(teamGame) && !!valorantId;
  const displayName = useValorantId ? valorantId! : baseDisplayName;
  const ign = useValorantId ? valorantId! : ((row.ign as string) || username);

  return {
    userId,
    username,
    discordUsername: discordUsernames.get(userId) || username,
    displayName,
    avatarInitials: (row.avatar_initials as string) || initialsFromName(baseDisplayName),
    avatarUrl: snapshot?.avatarUrl ?? null,
    profileSlug: resolveMemberProfileSlug(snapshot?.slug, username),
    ign,
    role: row.role as TeamMember["role"],
    status: row.status as TeamMember["status"],
    joinedAt: row.joined_at as string,
  };
}

async function mapTeamMemberRows(
  rows: Record<string, unknown>[],
  teamGame: Team["game"],
): Promise<TeamMember[]> {
  const userIds = rows.map((row) => row.user_id as string);
  const [snapshots, discordUsernames] = await Promise.all([
    fetchMemberProfileSnapshots(userIds),
    fetchDiscordUsernames(userIds),
  ]);

  return mapTeamMemberRowsWithMaps(rows, teamGame, snapshots, discordUsernames);
}

function mapTeamMemberRowsWithMaps(
  rows: Record<string, unknown>[],
  teamGame: Team["game"],
  snapshots: Map<string, MemberProfileSnapshot>,
  discordUsernames: Map<string, string>,
): TeamMember[] {
  return rows.map((row) => rowToTeamMember(row, snapshots, discordUsernames, teamGame));
}

async function buildTeamsFromRows(
  teamRows: Record<string, unknown>[],
  memberRows: Record<string, unknown>[],
): Promise<Team[]> {
  if (!teamRows.length) return [];

  const userIds = [...new Set(memberRows.map((row) => row.user_id as string))];
  const [snapshots, discordUsernames] = await Promise.all([
    fetchMemberProfileSnapshots(userIds),
    fetchDiscordUsernames(userIds),
  ]);

  const membersByTeam = new Map<string, TeamMember[]>();
  for (const teamRow of teamRows) {
    const teamId = teamRow.id as string;
    const teamGame = teamRow.game as Team["game"];
    const teamMemberRows = memberRows.filter((row) => row.team_id === teamId);
    membersByTeam.set(
      teamId,
      mapTeamMemberRowsWithMaps(teamMemberRows, teamGame, snapshots, discordUsernames),
    );
  }

  return teamRows.map((row) => rowToTeam(row, membersByTeam.get(row.id as string) ?? []));
}

async function resolveMemberTeamIdentity(
  memberId: string,
  fallback: string,
  game: Team["game"],
): Promise<{ displayName: string; ign: string }> {
  const snapshots = await fetchMemberProfileSnapshots([memberId]);
  const snapshot = snapshots.get(memberId);
  const baseDisplayName = snapshot?.displayName || fallback;
  const valorantId =
    snapshot && isValorantGame(game)
      ? formatValorantRiotId(snapshot.valorantGameName, snapshot.valorantTagline)
      : null;

  if (isValorantGame(game) && valorantId) {
    return { displayName: valorantId, ign: valorantId };
  }

  return { displayName: baseDisplayName, ign: fallback };
}

function rowToTeam(row: Record<string, unknown>, members: TeamMember[]): Team {
  return {
    id: row.id as string,
    name: row.name as string,
    tag: row.tag as string,
    game: row.game as Team["game"],
    captainUserId: row.captain_user_id as string,
    members,
    createdAt: row.created_at as string,
    activeTournamentId: (row.active_tournament_id as string) ?? null,
    activeTournamentName: (row.active_tournament_name as string) ?? null,
  };
}

async function fetchActiveTeamGamesForMember(memberId: string, excludeTeamId?: string): Promise<string[]> {
  const { data: memberships, error: memberErr } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", memberId)
    .in("status", ["captain", "active"]);

  if (memberErr) throw new Error(memberErr.message);

  const teamIds = (memberships ?? [])
    .map((row) => row.team_id as string)
    .filter((teamId) => teamId !== excludeTeamId);

  if (!teamIds.length) return [];

  const { data: teamRows, error: teamErr } = await supabase
    .from("teams")
    .select("game")
    .in("id", teamIds);

  if (teamErr) throw new Error(teamErr.message);
  return (teamRows ?? []).map((row) => row.game as string);
}

function countRosterMembers(members: TeamMember[]): number {
  return members.filter((m) => m.status !== "removed").length;
}

async function assertRosterHasCapacity(team: Team): Promise<void> {
  if (countRosterMembers(team.members) >= MAX_TEAM_SIZE) {
    throw new Error(`Team is full (${MAX_TEAM_SIZE} members max).`);
  }
}

async function assertMemberAvailableForGame(
  memberId: string,
  game: Team["game"],
  excludeTeamId?: string,
): Promise<void> {
  const activeGames = await fetchActiveTeamGamesForMember(memberId, excludeTeamId);
  if (activeGames.includes(game)) {
    throw new Error(`Already on an active ${game} team. Leave that roster before joining another.`);
  }
}

interface TeamMemberRowPayload {
  team_id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_initials: string;
  ign: string;
  role: string;
  status: TeamMember["status"];
}

async function insertOrReactivateTeamMember(
  payload: TeamMemberRowPayload,
  username: string,
): Promise<void> {
  const { data: existing, error: existingErr } = await supabase
    .from("team_members")
    .select("status")
    .eq("team_id", payload.team_id)
    .eq("user_id", payload.user_id)
    .maybeSingle();

  if (existingErr) {
    throw new Error(
      `Failed to look up team member (team_id=${payload.team_id}, user_id=${payload.user_id}): ${existingErr.message}`,
    );
  }

  if (existing) {
    if (existing.status !== "removed") {
      throw new Error(`${username} is already on this team.`);
    }

    const { error } = await supabase
      .from("team_members")
      .update({
        username: payload.username,
        display_name: payload.display_name,
        avatar_initials: payload.avatar_initials,
        ign: payload.ign,
        role: payload.role,
        status: payload.status,
        joined_at: new Date().toISOString(),
      })
      .eq("team_id", payload.team_id)
      .eq("user_id", payload.user_id);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("team_members").insert(payload);
  if (error) throw new Error(error.message);
}

const TEAM_LIST_COLUMNS =
  "id, name, tag, game, captain_user_id, created_at, active_tournament_id, active_tournament_name";

const TEAM_MEMBER_LIST_COLUMNS =
  "team_id, user_id, username, display_name, avatar_initials, ign, role, status, joined_at";

async function fetchTeamWithMembers(teamId: string): Promise<Team> {
  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .select(TEAM_LIST_COLUMNS)
    .eq("id", teamId)
    .single();

  if (teamErr) throw new Error(teamErr.message);

  const { data: memberRows, error: membersErr } = await supabase
    .from("team_members")
    .select(TEAM_MEMBER_LIST_COLUMNS)
    .eq("team_id", teamId)
    .neq("status", "removed");

  if (membersErr) throw new Error(membersErr.message);

  return rowToTeam(
    teamRow,
    await mapTeamMemberRows(memberRows ?? [], teamRow.game as Team["game"]),
  );
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function fetchTeams(): Promise<Team[]> {
  const { data: teamRows, error: teamsErr } = await supabase
    .from("teams")
    .select(TEAM_LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (teamsErr) throw new Error(teamsErr.message);
  if (!teamRows?.length) return [];

  const teamIds = teamRows.map((t) => t.id as string);

  const { data: memberRows, error: membersErr } = await supabase
    .from("team_members")
    .select(TEAM_MEMBER_LIST_COLUMNS)
    .in("team_id", teamIds)
    .neq("status", "removed");

  if (membersErr) throw new Error(membersErr.message);

  const rows = memberRows ?? [];
  return buildTeamsFromRows(teamRows, rows);
}

const TEAMS_BY_ID_CHUNK = 100;

/** Fetch specific teams with rosters (batched when many IDs). */
export async function fetchTeamsByIds(teamIds: string[]): Promise<Team[]> {
  const unique = [...new Set(teamIds.filter(Boolean))];
  if (!unique.length) return [];

  const teams: Team[] = [];
  for (let i = 0; i < unique.length; i += TEAMS_BY_ID_CHUNK) {
    const chunk = unique.slice(i, i + TEAMS_BY_ID_CHUNK);

    const { data: teamRows, error: teamsErr } = await supabase
      .from("teams")
      .select(TEAM_LIST_COLUMNS)
      .in("id", chunk);

    if (teamsErr) throw new Error(teamsErr.message);
    if (!teamRows?.length) continue;

    const chunkTeamIds = teamRows.map((t) => t.id as string);
    const { data: memberRows, error: membersErr } = await supabase
      .from("team_members")
      .select(TEAM_MEMBER_LIST_COLUMNS)
      .in("team_id", chunkTeamIds)
      .neq("status", "removed");

    if (membersErr) throw new Error(membersErr.message);

    teams.push(...(await buildTeamsFromRows(teamRows, memberRows ?? [])));
  }

  return teams;
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const captain = await fetchMemberById(input.captainMemberId);
  if (!captain) throw new Error("Selected captain was not found.");

  await assertMemberAvailableForGame(captain.id, input.game);

  // Insert team
  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .insert({
      name: input.name,
      tag: input.tag,
      game: input.game,
      captain_user_id: captain.id,
    })
    .select()
    .single();

  if (teamErr) {
    if (teamErr.code === "23505") throw new Error("A team with this tag already exists.");
    throw new Error(teamErr.message);
  }

  // Insert captain as first team member
  const captainRole = resolveRoleForGame(input.captainRole ?? "TBD", input.game);
  const captainIdentity = await resolveMemberTeamIdentity(
    captain.id,
    captain.username,
    input.game,
  );
  const captainMember = adminMemberToTeamMember(
    captain,
    captainRole,
    captainIdentity.displayName,
    captainIdentity.ign,
  );
  const { error: memberErr } = await supabase.from("team_members").insert({
    team_id: teamRow.id,
    user_id: captain.id,
    username: captainMember.username,
    display_name: captainMember.displayName,
    avatar_initials: captainMember.avatarInitials,
    ign: captainMember.ign,
    role: captainRole,
    status: "captain",
  });

  if (memberErr) {
    await supabase.from("teams").delete().eq("id", teamRow.id);
    throw new Error(memberErr.message);
  }

  return fetchTeamWithMembers(teamRow.id as string);
}

export async function addMemberToTeam(input: AddTeamMemberInput): Promise<Team> {
  const member = await fetchMemberById(input.memberId);
  if (!member) throw new Error("Member not found.");

  const team = await fetchTeamWithMembers(input.teamId);
  await assertRosterHasCapacity(team);
  await assertMemberAvailableForGame(member.id, team.game, input.teamId);

  const memberIdentity = await resolveMemberTeamIdentity(
    member.id,
    member.username,
    team.game,
  );
  const memberRole = resolveRoleForGame(input.role ?? "TBD", team.game);
  const teamMember = adminMemberToTeamMember(
    member,
    memberRole,
    memberIdentity.displayName,
    memberIdentity.ign,
  );
  await insertOrReactivateTeamMember(
    {
      team_id: input.teamId,
      user_id: member.id,
      username: teamMember.username,
      display_name: teamMember.displayName,
      avatar_initials: teamMember.avatarInitials,
      ign: teamMember.ign,
      role: memberRole,
      status: "active",
    },
    member.username,
  );

  return fetchTeamWithMembers(input.teamId);
}

export interface AddMembersToTeamFailure {
  memberId: string;
  message: string;
}

export interface AddMembersToTeamResult {
  team: Team;
  added: string[];
  failed: AddMembersToTeamFailure[];
}

export async function addMembersToTeam(
  teamId: string,
  memberIds: string[],
): Promise<AddMembersToTeamResult> {
  const added: string[] = [];
  const failed: AddMembersToTeamFailure[] = [];

  for (const memberId of memberIds) {
    try {
      await addMemberToTeam({ teamId, memberId });
      added.push(memberId);
    } catch (err) {
      failed.push({
        memberId,
        message: err instanceof Error ? err.message : "Failed to add member.",
      });
    }
  }

  const team = await fetchTeamWithMembers(teamId);
  return { team, added, failed };
}

export async function inviteMemberToTeam(input: AddTeamMemberInput): Promise<Team> {
  const member = await fetchMemberById(input.memberId);
  if (!member) throw new Error("Member not found.");

  const team = await fetchTeamWithMembers(input.teamId);
  await assertRosterHasCapacity(team);
  await assertMemberAvailableForGame(member.id, team.game, input.teamId);

  const memberIdentity = await resolveMemberTeamIdentity(
    member.id,
    member.username,
    team.game,
  );
  const memberRole = resolveRoleForGame(input.role ?? "TBD", team.game);
  const teamMember = adminMemberToTeamMember(
    member,
    memberRole,
    memberIdentity.displayName,
    memberIdentity.ign,
  );
  await insertOrReactivateTeamMember(
    {
      team_id: input.teamId,
      user_id: member.id,
      username: teamMember.username,
      display_name: teamMember.displayName,
      avatar_initials: teamMember.avatarInitials,
      ign: teamMember.ign,
      role: memberRole,
      status: "invited",
    },
    member.username,
  );

  return fetchTeamWithMembers(input.teamId);
}

export interface UserTeamMembershipRow {
  teamId: string;
  status: TeamMember["status"];
  joinedAt: string;
}

/** All team membership rows for a user, including removed (for notification sync). */
export async function fetchUserTeamMembershipRows(userId: string): Promise<UserTeamMembershipRow[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, status, joined_at")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    teamId: row.team_id as string,
    status: row.status as TeamMember["status"],
    joinedAt: row.joined_at as string,
  }));
}

export async function fetchTeamsForUser(userId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .neq("status", "removed");

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const teamIds = [...new Set(data.map((row) => row.team_id as string))];
  const teams = await Promise.all(teamIds.map((teamId) => fetchTeamById(teamId)));

  return teams
    .filter((team): team is Team => team !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function fetchTeamForUser(userId: string): Promise<Team | null> {
  const teams = await fetchTeamsForUser(userId);
  return teams[0] ?? null;
}

export async function fetchTeamById(teamId: string): Promise<Team | null> {
  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamErr) throw new Error(teamErr.message);
  if (!teamRow) return null;

  return fetchTeamWithMembers(teamId);
}

export async function updateTeam(
  teamId: string,
  input: Pick<CreateTeamInput, "name" | "tag" | "game">,
): Promise<Team> {
  const existing = await fetchTeamWithMembers(teamId);
  if (input.game !== existing.game) {
    const activeMembers = existing.members.filter((m) => m.status !== "removed");
    await Promise.all(
      activeMembers.map((member) =>
        assertMemberAvailableForGame(member.userId, input.game, teamId),
      ),
    );
  }

  const { error } = await supabase
    .from("teams")
    .update({
      name: input.name,
      tag: input.tag,
      game: input.game,
    })
    .eq("id", teamId);

  if (error) {
    if (error.code === "23505") throw new Error("A team with this tag already exists.");
    throw new Error(error.message);
  }

  return fetchTeamWithMembers(teamId);
}

export async function acceptTeamInvite(teamId: string, userId: string): Promise<Team> {
  const team = await fetchTeamWithMembers(teamId);
  await assertMemberAvailableForGame(userId, team.game, teamId);

  const { data: updated, error } = await supabase
    .from("team_members")
    .update({ status: "active" })
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .eq("status", "invited")
    .select("user_id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("No pending invite found for this team.");
  return fetchTeamWithMembers(teamId);
}

export async function declineTeamInvite(teamId: string, userId: string): Promise<void> {
  const { data: updated, error } = await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .eq("status", "invited")
    .select("user_id");

  if (error) throw new Error(error.message);
  if (!updated?.length) throw new Error("No pending invite found for this team.");
}

export async function removeMemberFromTeam(teamId: string, userId: string): Promise<Team> {
  const team = await fetchTeamWithMembers(teamId);
  const member = team.members.find((m) => m.userId === userId);
  if (!member) throw new Error("Member not found on this team.");
  if (member.status === "captain") {
    throw new Error("Cannot remove the captain. Edit the team or assign a new captain first.");
  }

  const { error } = await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return fetchTeamWithMembers(teamId);
}

export async function updateTeamMemberRole(
  teamId: string,
  memberUserId: string,
  role: TeamMemberRole,
  actingUserId: string,
): Promise<Team> {
  const team = await fetchTeamWithMembers(teamId);
  const member = team.members.find((m) => m.userId === memberUserId);
  if (!member || member.status === "removed") {
    throw new Error("Member not found on this team.");
  }
  if (member.status !== "captain" && member.status !== "active") {
    throw new Error("Only active roster members can have their role updated.");
  }

  const isCaptain = team.captainUserId === actingUserId;
  if (!isCaptain && memberUserId !== actingUserId) {
    throw new Error("You can only update your own role.");
  }

  const sanitizedRole = resolveRoleForGame(role, team.game);
  const { error } = await supabase
    .from("team_members")
    .update({ role: sanitizedRole })
    .eq("team_id", teamId)
    .eq("user_id", memberUserId);

  if (error) throw new Error(error.message);
  return fetchTeamWithMembers(teamId);
}

export async function transferTeamCaptain(
  teamId: string,
  newCaptainUserId: string,
  actingUserId: string,
): Promise<Team> {
  const team = await fetchTeamWithMembers(teamId);
  if (team.captainUserId !== actingUserId) {
    throw new Error("Only the team captain can transfer captaincy.");
  }
  if (newCaptainUserId === actingUserId) {
    throw new Error("Select a different member to transfer captaincy.");
  }

  const target = team.members.find((m) => m.userId === newCaptainUserId);
  if (!target || target.status !== "active") {
    throw new Error("Captaincy can only be transferred to an active roster member.");
  }

  await transferTeamCaptainFn({ data: { teamId, newCaptainUserId } });
  return fetchTeamWithMembers(teamId);
}

export async function leaveTeam(teamId: string, actingUserId: string): Promise<void> {
  const team = await fetchTeamWithMembers(teamId);
  if (team.captainUserId === actingUserId) {
    throw new Error("Captains must transfer captaincy before leaving the team.");
  }

  const membership = team.members.find((m) => m.userId === actingUserId);
  if (!membership || membership.status !== "active") {
    throw new Error("Only active roster members can leave the team.");
  }

  await leaveTeamFn({ data: { teamId } });
}

export async function deleteTeam(teamId: string): Promise<void> {
  await deleteTeamAdminFn({ data: { teamId } });
}

export async function deleteTeamAsCaptain(teamId: string): Promise<void> {
  await deleteTeamCaptainFn({ data: { teamId } });
}

export async function assignTeamActiveTournament(
  teamId: string,
  tournamentId: string,
  tournamentName: string,
): Promise<void> {
  const { error } = await supabase
    .from("teams")
    .update({ active_tournament_id: tournamentId, active_tournament_name: tournamentName })
    .eq("id", teamId);

  if (error) throw new Error(error.message);
}
