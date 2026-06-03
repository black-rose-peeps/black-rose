/**
 * Tournament team registrations — mock store until Supabase.
 */

import {
  assignTeamActiveTournament,
  fetchTeams,
} from "@/features/admin/features/teams/services/teams.service";
import type { Team } from "@/features/teams/types";
import { mockTeams, type MockTeam } from "@/lib/mock-data";
import { getTournamentByIdSync, syncTournamentTeamCount } from "./tournaments.service";

const MOCK_LATENCY_MS = 150;

let registrationsStore: MockTeam[] = [...mockTeams];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function teamToRegistration(team: Team, tournamentId: string): MockTeam {
  const captain =
    team.members.find((m) => m.status === "captain") ??
    team.members.find((m) => m.status === "active") ??
    team.members[0];

  return {
    id: `reg-${team.id}`,
    rosterTeamId: team.id,
    name: team.name,
    tag: team.tag,
    captain: captain?.username ?? captain?.ign ?? "—",
    members: team.members
      .filter((m) => m.status === "captain" || m.status === "active")
      .map((m) => ({
        ign: m.ign,
        role: m.role,
        discord: `${m.username}#0000`,
      })),
    registrationDate: new Date().toISOString().slice(0, 10),
    status: "Approved",
    tournamentId,
    history: [],
  };
}

export async function fetchTournamentRegistrations(
  tournamentId: string,
): Promise<MockTeam[]> {
  await delay(MOCK_LATENCY_MS);
  return registrationsStore.filter((t) => t.tournamentId === tournamentId);
}

export async function fetchAllRegistrations(): Promise<MockTeam[]> {
  await delay(MOCK_LATENCY_MS);
  return [...registrationsStore].sort((a, b) =>
    b.registrationDate.localeCompare(a.registrationDate),
  );
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: MockTeam["status"],
): Promise<MockTeam> {
  await delay(MOCK_LATENCY_MS);

  const index = registrationsStore.findIndex((t) => t.id === registrationId);
  if (index === -1) {
    throw new Error("Registration not found.");
  }

  const updated = { ...registrationsStore[index], status };
  registrationsStore = registrationsStore.map((t, i) => (i === index ? updated : t));
  return updated;
}

export async function addTeamToTournament(
  tournamentId: string,
  rosterTeamId: string,
): Promise<MockTeam> {
  await delay(MOCK_LATENCY_MS);

  const tournament = getTournamentByIdSync(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found.");
  }

  const current = registrationsStore.filter((t) => t.tournamentId === tournamentId);
  if (current.length >= tournament.teamCap) {
    throw new Error(`Team cap reached (${tournament.teamCap}).`);
  }

  if (
    current.some((r) => r.rosterTeamId === rosterTeamId || r.id === `reg-${rosterTeamId}`)
  ) {
    throw new Error("This team is already registered for this tournament.");
  }

  const allTeams = await fetchTeams();
  const rosterTeam = allTeams.find((t) => t.id === rosterTeamId);
  if (!rosterTeam) {
    throw new Error("Team not found. Create the team under Teams first.");
  }

  if (
    rosterTeam.game !== "Multi" &&
    rosterTeam.game !== tournament.game
  ) {
    throw new Error(
      `${rosterTeam.name} is registered for ${rosterTeam.game}, but this tournament is ${tournament.game}.`,
    );
  }

  if (
    rosterTeam.activeTournamentId &&
    rosterTeam.activeTournamentId !== tournamentId
  ) {
    throw new Error(
      `${rosterTeam.name} is already active in ${rosterTeam.activeTournamentName ?? "another tournament"}.`,
    );
  }

  const registration = teamToRegistration(rosterTeam, tournamentId);
  registrationsStore = [registration, ...registrationsStore];
  syncTournamentTeamCount(tournamentId, current.length + 1);
  assignTeamActiveTournament(rosterTeam.id, tournamentId, tournament.name);

  return registration;
}

export function resetRegistrationsStoreForTesting(): void {
  registrationsStore = [...mockTeams];
}
