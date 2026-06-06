import { supabase } from "@/lib/supabase";
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

  // Check if captain is already on an active team
  const { data: existing } = await supabase
    .from("team_members")
    .select("team_id, teams(name)")
    .eq("user_id", captain.id)
    .in("status", ["captain", "active"])
    .maybeSingle();

  if (existing) {
    const teamName = (existing.teams as { name: string } | null)?.name ?? "another team";
    throw new Error(`${captain.username} is already on team ${teamName}.`);
  }

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
  const captainMember = adminMemberToTeamMember(captain, "IGL");
  const { error: memberErr } = await supabase.from("team_members").insert({
    team_id: teamRow.id,
    user_id: captain.id,
    username: captainMember.username,
    display_name: captainMember.displayName,
    avatar_initials: captainMember.avatarInitials,
    ign: captainMember.ign,
    role: captainMember.role,
    status: "captain",
  });

  if (memberErr) throw new Error(memberErr.message);

  return fetchTeamWithMembers(teamRow.id as string);
}

export async function addMemberToTeam(input: AddTeamMemberInput): Promise<Team> {
  const member = await fetchMemberById(input.memberId);
  if (!member) throw new Error("Member not found.");

  // Check already on this team
  const { data: onTeam } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", input.teamId)
    .eq("user_id", member.id)
    .neq("status", "removed")
    .maybeSingle();

  if (onTeam) throw new Error(`${member.username} is already on this team.`);

  // Check already on another team
  const { data: otherTeam } = await supabase
    .from("team_members")
    .select("team_id, teams(name)")
    .eq("user_id", member.id)
    .in("status", ["captain", "active"])
    .maybeSingle();

  if (otherTeam) {
    const teamName = (otherTeam.teams as { name: string } | null)?.name ?? "another team";
    throw new Error(`${member.username} is already on team ${teamName}.`);
  }

  const teamMember = adminMemberToTeamMember(member, input.role ?? "TBD");
  const { error } = await supabase.from("team_members").insert({
    team_id: input.teamId,
    user_id: member.id,
    username: teamMember.username,
    display_name: teamMember.displayName,
    avatar_initials: teamMember.avatarInitials,
    ign: teamMember.ign,
    role: input.role ?? "TBD",
    status: "active",
  });

  if (error) throw new Error(error.message);

  return fetchTeamWithMembers(input.teamId);
}

export async function fetchTeamById(teamId: string): Promise<Team | null> {
  try {
    return await fetchTeamWithMembers(teamId);
  } catch {
    return null;
  }
}

export async function updateTeam(
  teamId: string,
  input: Pick<CreateTeamInput, "name" | "tag" | "game">,
): Promise<Team> {
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
  const { data: registration, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("roster_team_id", teamId)
    .limit(1);

  if (regErr) throw new Error(regErr.message);
  if (registration && registration.length > 0) {
    throw new Error("Remove this team from all tournaments before deleting.");
  }

  const { error: membersErr } = await supabase.from("team_members").delete().eq("team_id", teamId);
  if (membersErr) throw new Error(membersErr.message);

  const { error } = await supabase.from("teams").delete().eq("id", teamId);
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
