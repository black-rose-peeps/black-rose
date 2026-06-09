import { supabase } from "@/lib/supabase";
import { MAX_TEAM_SIZE } from "@/features/teams/constants";
import type { Team, TeamMember } from "@/features/teams/types";
import type { AddTeamMemberInput, CreateTeamInput } from "../types";
import { adminMemberToTeamMember } from "../utils";
import { fetchMemberById } from "@/features/admin/features/members/services/members.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function rowToTeamMember(row: Record<string, unknown>): TeamMember {
  return {
    userId: row.user_id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    avatarInitials: row.avatar_initials as string,
    ign: row.ign as string,
    role: row.role as TeamMember["role"],
    status: row.status as TeamMember["status"],
    joinedAt: row.joined_at as string,
  };
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
  const { data: existing } = await supabase
    .from("team_members")
    .select("status")
    .eq("team_id", payload.team_id)
    .eq("user_id", payload.user_id)
    .maybeSingle();

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

async function fetchTeamWithMembers(teamId: string): Promise<Team> {
  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (teamErr) throw new Error(teamErr.message);

  const { data: memberRows, error: membersErr } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .neq("status", "removed");

  if (membersErr) throw new Error(membersErr.message);

  return rowToTeam(teamRow, (memberRows ?? []).map(rowToTeamMember));
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function fetchTeams(): Promise<Team[]> {
  const { data: teamRows, error: teamsErr } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (teamsErr) throw new Error(teamsErr.message);
  if (!teamRows?.length) return [];

  const teamIds = teamRows.map((t) => t.id as string);

  const { data: memberRows, error: membersErr } = await supabase
    .from("team_members")
    .select("*")
    .in("team_id", teamIds)
    .neq("status", "removed");

  if (membersErr) throw new Error(membersErr.message);

  const membersByTeam = new Map<string, TeamMember[]>();
  for (const row of memberRows ?? []) {
    const tid = row.team_id as string;
    if (!membersByTeam.has(tid)) membersByTeam.set(tid, []);
    membersByTeam.get(tid)!.push(rowToTeamMember(row));
  }

  return teamRows.map((row) => rowToTeam(row, membersByTeam.get(row.id as string) ?? []));
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
  const captainRole = input.captainRole ?? "IGL";
  const captainMember = adminMemberToTeamMember(captain, captainRole);
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

  const teamMember = adminMemberToTeamMember(member, input.role ?? "TBD");
  await insertOrReactivateTeamMember(
    {
      team_id: input.teamId,
      user_id: member.id,
      username: teamMember.username,
      display_name: teamMember.displayName,
      avatar_initials: teamMember.avatarInitials,
      ign: teamMember.ign,
      role: input.role ?? "TBD",
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

  const teamMember = adminMemberToTeamMember(member, input.role ?? "TBD");
  await insertOrReactivateTeamMember(
    {
      team_id: input.teamId,
      user_id: member.id,
      username: teamMember.username,
      display_name: teamMember.displayName,
      avatar_initials: teamMember.avatarInitials,
      ign: teamMember.ign,
      role: input.role ?? "TBD",
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
  const membership = team.members.find((m) => m.userId === userId);
  if (!membership || membership.status !== "invited") {
    throw new Error("No pending invite found for this team.");
  }

  await assertMemberAvailableForGame(userId, team.game, teamId);

  const { error } = await supabase
    .from("team_members")
    .update({ status: "active" })
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return fetchTeamWithMembers(teamId);
}

export async function declineTeamInvite(teamId: string, userId: string): Promise<void> {
  const team = await fetchTeamWithMembers(teamId);
  const membership = team.members.find((m) => m.userId === userId);
  if (!membership || membership.status !== "invited") {
    throw new Error("No pending invite found for this team.");
  }

  const { error } = await supabase
    .from("team_members")
    .update({ status: "removed" })
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
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

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_team_and_members", {
    p_team_id: teamId,
  });

  if (error) throw new Error(error.message);
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
