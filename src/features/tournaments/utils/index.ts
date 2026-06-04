import type { TournamentStatus } from "../types";
import type { MockTournament, MockTeam } from "@/lib/mock-data";
import type { TournamentTeam } from "../types";

/** Statuses visible on the public tournament directory (excludes Draft). */
export const PUBLIC_STATUSES = new Set<string>([
  "Registration Open",
  "Registration Closed",
  "Live",
  "Completed",
  "Archived",
]);

/**
 * Filter mock tournaments to only those visible on the public directory,
 * and narrow the status type to TournamentStatus (excludes "Draft").
 */
export function getPublicTournaments(
  tournaments: MockTournament[],
): (MockTournament & { status: TournamentStatus })[] {
  return tournaments.filter((t) => PUBLIC_STATUSES.has(t.status)) as (MockTournament & {
    status: TournamentStatus;
  })[];
}

/**
 * Convert an approved MockTeam (admin registration shape) to a TournamentTeam
 * (public detail shape). Seed is derived from registration order (1-indexed).
 */
export function mockTeamToTournamentTeam(team: MockTeam, index: number): TournamentTeam {
  return {
    id: team.id,
    name: team.name,
    tag: team.tag,
    captain: team.captain,
    seed: index + 1,
    players: team.members.map((m) => ({ ign: m.ign, role: m.role })),
  };
}
