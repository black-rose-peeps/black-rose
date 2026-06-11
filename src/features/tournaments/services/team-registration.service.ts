import {
  fetchRegistrationsForTeam,
  fetchTeamTournamentRegistration,
  requestCaptainTeamRegistration,
} from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { fetchTournaments } from "@/features/admin/features/tournaments/services/tournaments.service";
import { fetchTeamsForUser } from "@/features/admin/features/teams/services/teams.service";
import { isActiveMember } from "@/features/teams/utils/membership";
import { isSoloTournament } from "@/features/tournaments/types/participation";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
import type { Team } from "@/features/teams/types";

export {
  fetchRegistrationsForTeam,
  fetchTeamTournamentRegistration,
  requestCaptainTeamRegistration,
};

export async function fetchCaptainTeams(memberId: string): Promise<Team[]> {
  const teams = await fetchTeamsForUser(memberId);
  return teams.filter((team) => team.captainUserId === memberId);
}

/** Teams where the member is on the active roster (captain or accepted member). */
export async function fetchActiveMemberTeams(memberId: string): Promise<Team[]> {
  const teams = await fetchTeamsForUser(memberId);
  return teams.filter((team) => isActiveMember(team, memberId));
}

export async function fetchOpenTeamTournaments(game?: Team["game"]): Promise<MockTournament[]> {
  const tournaments = await fetchTournaments();
  return tournaments.filter((tournament) => {
    if (tournament.status !== "Registration Open") return false;
    if (isSoloTournament(tournament)) return false;
    if (!game || game === "Multi") return true;
    return tournament.game === game;
  });
}

export function teamHasOpenRegistration(
  registrations: MockTeam[],
  tournamentId: string,
): boolean {
  const registration = registrations.find((r) => r.tournamentId === tournamentId);
  if (!registration) return false;
  return (
    registration.status === "Pending" ||
    registration.status === "Approved" ||
    registration.status === "Previously Competed"
  );
}

export function pendingRegistrations(registrations: MockTeam[]): MockTeam[] {
  return registrations.filter((r) => r.status === "Pending");
}

export function approvedRegistration(registrations: MockTeam[]): MockTeam | null {
  return registrations.find((r) => r.status === "Approved") ?? null;
}

/** Captain's registration state for a tournament (across all of their teams). */
export type CaptainTournamentRegistrationStatus =
  | "none"
  | "pending"
  | "approved"
  | "previously_competed";

const REGISTRATION_STATUS_PRIORITY: Record<CaptainTournamentRegistrationStatus, number> = {
  none: 0,
  pending: 1,
  previously_competed: 2,
  approved: 3,
};

function registrationStatusFromRow(
  status: MockTeam["status"],
): CaptainTournamentRegistrationStatus {
  switch (status) {
    case "Approved":
      return "approved";
    case "Previously Competed":
      return "previously_competed";
    case "Pending":
      return "pending";
    default:
      return "none";
  }
}

function mergeCaptainRegistrationStatus(
  current: CaptainTournamentRegistrationStatus,
  next: CaptainTournamentRegistrationStatus,
): CaptainTournamentRegistrationStatus {
  return REGISTRATION_STATUS_PRIORITY[next] > REGISTRATION_STATUS_PRIORITY[current]
    ? next
    : current;
}

export function isRegisteredCaptainStatus(status: CaptainTournamentRegistrationStatus): boolean {
  return status === "approved";
}

export function isPendingCaptainRegistrationStatus(
  status: CaptainTournamentRegistrationStatus,
): boolean {
  return status === "pending" || status === "previously_competed";
}

export async function fetchCaptainRegistrationStatusForTournament(
  memberId: string,
  tournamentId: string,
  tournamentGame: string,
): Promise<CaptainTournamentRegistrationStatus> {
  const teams = await fetchCaptainTeams(memberId);
  const compatible = teams.filter(
    (team) => team.game === "Multi" || team.game === tournamentGame,
  );

  const registrations = await Promise.all(
    compatible.map((team) => fetchTeamTournamentRegistration(team.id, tournamentId)),
  );

  let status: CaptainTournamentRegistrationStatus = "none";
  for (const registration of registrations) {
    if (!registration || registration.status === "Rejected") continue;
    status = mergeCaptainRegistrationStatus(
      status,
      registrationStatusFromRow(registration.status),
    );
  }
  return status;
}

export async function fetchCaptainTournamentRegistrationMap(
  memberId: string,
): Promise<Map<string, CaptainTournamentRegistrationStatus>> {
  const teams = await fetchCaptainTeams(memberId);
  const map = new Map<string, CaptainTournamentRegistrationStatus>();

  await Promise.all(
    teams.map(async (team) => {
      const registrations = await fetchRegistrationsForTeam(team.id);
      for (const registration of registrations) {
        const next = registrationStatusFromRow(registration.status);
        if (next === "none") continue;
        const tournamentId = registration.tournamentId;
        const current = map.get(tournamentId) ?? "none";
        map.set(tournamentId, mergeCaptainRegistrationStatus(current, next));
      }
    }),
  );

  return map;
}

export async function fetchCaptainTeamsForTournament(
  memberId: string,
  tournamentId: string,
): Promise<Team[]> {
  const teams = await fetchCaptainTeams(memberId);
  const registrations = await Promise.all(
    teams.map(async (team) => ({
      team,
      registration: await fetchTeamTournamentRegistration(team.id, tournamentId),
    })),
  );

  return registrations
    .filter(({ registration }) => !registration || registration.status === "Rejected")
    .map(({ team }) => team);
}
