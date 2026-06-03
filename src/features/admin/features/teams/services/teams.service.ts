/**
 * Teams data layer — replace mock store with Supabase when tables exist.
 */

import { fetchMemberById } from "@/features/admin/features/members/services/members.service";
import { mockTeams } from "@/lib/mock-teams";
import type { Team } from "@/features/teams/types";
import type { AddTeamMemberInput, CreateTeamInput } from "../types";
import { adminMemberToTeamMember } from "../utils";

const MOCK_LATENCY_MS = 200;

let teamsStore: Team[] = [...mockTeams];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findTeamMemberTeam(memberId: string): Team | undefined {
  return teamsStore.find((team) =>
    team.members.some(
      (m) => m.userId === memberId && (m.status === "captain" || m.status === "active"),
    ),
  );
}

export async function fetchTeams(): Promise<Team[]> {
  await delay(MOCK_LATENCY_MS);
  return [...teamsStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  await delay(MOCK_LATENCY_MS);

  const captain = await fetchMemberById(input.captainMemberId);
  if (!captain) {
    throw new Error("Selected captain was not found.");
  }

  const existingTeam = findTeamMemberTeam(captain.id);
  if (existingTeam) {
    throw new Error(`${captain.username} is already on team ${existingTeam.name}.`);
  }

  if (teamsStore.some((t) => t.tag === input.tag)) {
    throw new Error("A team with this tag already exists.");
  }

  const team: Team = {
    id: `team-${crypto.randomUUID().slice(0, 8)}`,
    name: input.name,
    tag: input.tag,
    game: input.game,
    captainUserId: captain.id,
    members: [
      {
        ...adminMemberToTeamMember(captain, "IGL"),
        status: "captain",
      },
    ],
    createdAt: new Date().toISOString(),
    activeTournamentId: null,
    activeTournamentName: null,
  };

  teamsStore = [team, ...teamsStore];
  return team;
}

export async function addMemberToTeam(input: AddTeamMemberInput): Promise<Team> {
  await delay(MOCK_LATENCY_MS);

  const teamIndex = teamsStore.findIndex((t) => t.id === input.teamId);
  if (teamIndex === -1) {
    throw new Error("Team not found.");
  }

  const team = teamsStore[teamIndex];
  const member = await fetchMemberById(input.memberId);
  if (!member) {
    throw new Error("Member not found.");
  }

  if (team.members.some((m) => m.userId === member.id && m.status !== "removed")) {
    throw new Error(`${member.username} is already on this team.`);
  }

  const otherTeam = findTeamMemberTeam(member.id);
  if (otherTeam && otherTeam.id !== team.id) {
    throw new Error(`${member.username} is already on team ${otherTeam.name}.`);
  }

  const updated: Team = {
    ...team,
    members: [
      ...team.members,
      adminMemberToTeamMember(member, input.role ?? "TBD"),
    ],
  };

  teamsStore = teamsStore.map((t, i) => (i === teamIndex ? updated : t));
  return updated;
}

export function assignTeamActiveTournament(
  teamId: string,
  tournamentId: string,
  tournamentName: string,
): void {
  teamsStore = teamsStore.map((t) =>
    t.id === teamId
      ? { ...t, activeTournamentId: tournamentId, activeTournamentName: tournamentName }
      : t,
  );
}

export function resetTeamsStoreForTesting(): void {
  teamsStore = [...mockTeams];
}
