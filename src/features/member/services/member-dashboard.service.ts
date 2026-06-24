import { fetchPublishedBracketPayload } from "@/features/admin/features/tournament-details/services/bracket.service";
import { fetchTeamsForUser } from "@/features/admin/features/teams/services/teams.service";
import { fetchTournamentsLite } from "@/features/admin/features/tournaments/services/tournaments.service";
import { fetchRegistrationsForTeam } from "@/features/tournaments/services/team-registration.service";
import type { BracketRound } from "@/features/tournaments/types";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
import type { TournamentEntry, UpcomingMatch } from "../types";

export interface MemberTournamentDashboard {
  activeRegistrations: TournamentEntry[];
  upcomingMatches: UpcomingMatch[];
  tournamentHistory: string[];
}

function isActiveTournamentStatus(status: MockTournament["status"]): boolean {
  return status !== "Completed" && status !== "Archived" && status !== "Draft";
}

function isConcludedTournamentStatus(status: MockTournament["status"]): boolean {
  return status === "Completed" || status === "Archived";
}

function toTournamentEntry(
  registration: MockTeam,
  tournament: MockTournament | undefined,
): TournamentEntry {
  return {
    tournamentId: registration.tournamentId,
    tournamentName: tournament?.name ?? "Tournament",
    game: tournament?.game ?? "",
    status:
      registration.status === "Approved" || registration.status === "Previously Competed"
        ? "Approved"
        : registration.status === "Rejected"
          ? "Rejected"
          : "Pending",
    teamName: registration.name,
    teamTag: registration.tag,
  };
}

function extractUpcomingMatches(
  teamNames: Set<string>,
  tournamentId: string,
  tournamentName: string,
  tournamentStartDate: string,
  rounds: BracketRound[],
): UpcomingMatch[] {
  const results: UpcomingMatch[] = [];

  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.winner) continue;

      const sides = [match.teamA, match.teamB];
      const myTeam = sides.find((name) => name && teamNames.has(name));
      if (!myTeam) continue;

      const opponent = myTeam === match.teamA ? match.teamB : match.teamA;
      results.push({
        matchId: `${tournamentId}-${match.id}`,
        tournamentName,
        opponent: opponent ?? "TBD",
        scheduledAt: tournamentStartDate || "TBD",
        round: match.round || round.label,
      });
    }
  }

  return results;
}

export async function fetchMemberTournamentDashboard(
  memberId: string,
): Promise<MemberTournamentDashboard> {
  const [teams, tournaments] = await Promise.all([
    fetchTeamsForUser(memberId),
    fetchTournamentsLite(),
  ]);

  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));
  const registrationRows: MockTeam[] = [];
  const liveTeamsById = new Map(teams.map((team) => [team.id, team]));

  await Promise.all(
    teams.map(async (team) => {
      const regs = await fetchRegistrationsForTeam(team.id, {
        tournaments,
        liveTeamsById,
      });
      registrationRows.push(...regs);
    }),
  );

  const activeRegistrations: TournamentEntry[] = [];
  const tournamentHistory: string[] = [];
  const approvedTeamNamesByTournament = new Map<string, Set<string>>();

  for (const registration of registrationRows) {
    const tournament = tournamentById.get(registration.tournamentId);
    if (!tournament) continue;

    if (isConcludedTournamentStatus(tournament.status)) {
      if (
        registration.status === "Approved" ||
        registration.status === "Previously Competed"
      ) {
        tournamentHistory.push(tournament.name);
      }
      continue;
    }

    if (
      isActiveTournamentStatus(tournament.status) &&
      (registration.status === "Pending" || registration.status === "Approved")
    ) {
      activeRegistrations.push(toTournamentEntry(registration, tournament));
    }

    if (registration.status === "Approved" || registration.status === "Previously Competed") {
      if (!approvedTeamNamesByTournament.has(registration.tournamentId)) {
        approvedTeamNamesByTournament.set(registration.tournamentId, new Set());
      }
      approvedTeamNamesByTournament.get(registration.tournamentId)!.add(registration.name);
    }
  }

  const upcomingMatches: UpcomingMatch[] = [];

  await Promise.all(
    [...approvedTeamNamesByTournament.entries()].map(async ([tournamentId, teamNames]) => {
      const tournament = tournamentById.get(tournamentId);
      if (!tournament || !isActiveTournamentStatus(tournament.status)) return;

      try {
        const payload = await fetchPublishedBracketPayload(tournamentId);
        if (!payload?.rounds.length) return;
        upcomingMatches.push(
          ...extractUpcomingMatches(
            teamNames,
            tournamentId,
            tournament.name,
            tournament.startDate,
            payload.rounds,
          ),
        );
      } catch {
        // Bracket may not be published yet
      }
    }),
  );

  activeRegistrations.sort(
    (a, b) =>
      (a.status === "Pending" ? 0 : 1) - (b.status === "Pending" ? 0 : 1),
  );

  upcomingMatches.sort((a, b) => a.tournamentName.localeCompare(b.tournamentName));

  return {
    activeRegistrations,
    upcomingMatches,
    tournamentHistory: [...new Set(tournamentHistory)],
  };
}
