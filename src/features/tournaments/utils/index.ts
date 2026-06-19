import type { TournamentStatus } from "../types";
import type { MockTournament, MockTeam } from "@/lib/mock-data";
import type { TournamentTeam } from "../types";
import { resolveTournamentStatus } from "./tournament-status";

/** Statuses visible on the public tournament directory (excludes Draft and Archived). */
export const PUBLIC_STATUSES = new Set<string>([
  "Registration Open",
  "Registration Closed",
  "Live",
  "Completed",
]);

/** Tournament detail pages are hidden for draft and archived events. */
export function isHiddenFromPublicTournament(status: string): boolean {
  return status === "Draft" || status === "Archived";
}

/** Map DB/mock statuses to a value safe for public UI (excludes Draft). */
export function toPublicTournamentStatus(status: string): TournamentStatus {
  return PUBLIC_STATUSES.has(status) ? (status as TournamentStatus) : "Registration Closed";
}

/**
 * Filter mock tournaments to only those visible on the public directory,
 * and narrow the status type to TournamentStatus (excludes "Draft").
 */
export function getPublicTournaments(
  tournaments: MockTournament[],
): (MockTournament & { status: TournamentStatus })[] {
  return tournaments
    .map((tournament) => ({
      ...tournament,
      status: resolveTournamentStatus(tournament),
    }))
    .filter((t) => PUBLIC_STATUSES.has(t.status)) as (MockTournament & {
    status: TournamentStatus;
  })[];
}

/**
 * Convert an approved MockTeam (admin registration shape) to a TournamentTeam
 * (public detail shape). Seed is applied separately from admin bracket seeding.
 */
export function mockTeamToTournamentTeam(team: MockTeam): TournamentTeam {
  return {
    id: team.id,
    name: team.name,
    tag: team.tag,
    captain: team.captain,
    players: team.members.map((m) => ({
      ign: m.ign,
      role: m.role,
      discord: m.discord,
      profileSlug: m.profileSlug,
    })),
  };
}

export {
  applyRegistrationSeeds,
  seedByRegistrationId,
  tournamentTeamsHaveSeeds,
} from "./tournament-team-seeds";

export {
  bracketFieldSize,
  buildTournamentRulesForFormat,
  resolveTournamentRules,
  type TournamentRulesOptions,
} from "./tournament-rules";

export { buildTeamTagMap, teamDisplayAbbr, withTeamTags } from "./team-tags";

export {
  formatShortDate,
  formatSlotLabel,
  GAME_ABBREVIATIONS,
  GAME_COVER_GRADIENT,
  GAME_EDITORIAL_ACCENT,
  GAME_TOURNAMENT_HEADER,
  getGameAbbrev,
  pickSpotlightTournaments,
} from "./tournament-display";

export {
  blocksRegistrationReopen,
  calendarTodayDateOnly,
  isRegistrationDeadlineExtended,
  isRegistrationDeadlinePassed,
  isRegistrationOpen,
  isTournamentConcluded,
  resolveTournamentStatus,
  tournamentDateOnly,
  utcTodayDateOnly,
  withResolvedTournamentStatus,
} from "./tournament-status";
