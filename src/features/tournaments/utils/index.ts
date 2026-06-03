import type { TournamentStatus } from "../types";
import type { MockTournament } from "@/lib/mock-data";

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
