import { formatPrizePool, parseStoredPrizePool, prizeDigitsToNumber } from "@/lib/currency";
import type { TournamentFormat } from "@/features/tournaments/constants/formats";
import {
  isDoubleEliminationFormat,
  isSingleEliminationFormat,
} from "@/features/tournaments/constants/formats";
import type { AdminTournament, CreateTournamentFormValues, CreateTournamentInput } from "../types";
import type { CreateTournamentFieldErrors } from "../types";

export const BRACKET_TEAM_COUNT_SINGLE = 8;
export const BRACKET_TEAM_COUNT_DOUBLE = 16;

/** Returns true if n is a power of 2 and at least 2. */
function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

export function requiredBracketTeamCount(format: string): number | null {
  if (isSingleEliminationFormat(format)) return BRACKET_TEAM_COUNT_SINGLE;
  if (isDoubleEliminationFormat(format)) return BRACKET_TEAM_COUNT_DOUBLE;
  return null;
}

/**
 * Returns true when the bracket manager can be unlocked for the given team count.
 * Single elimination: any power-of-2 count ≥ 2.
 * Double elimination: any power-of-2 count ≥ 2.
 */
export function supportsBracketManager(format: string, teamCount: number): boolean {
  if (!isPowerOfTwo(teamCount)) return false;
  if (isSingleEliminationFormat(format)) return teamCount >= 2;
  if (isDoubleEliminationFormat(format)) return teamCount >= 2;
  return false;
}

export function tournamentToFormValues(tournament: AdminTournament): CreateTournamentFormValues {
  const { currency, digits } = parseStoredPrizePool(tournament.prizePool);
  return {
    name: tournament.name,
    game: tournament.game,
    format: tournament.format as TournamentFormat,
    prizeCurrency: currency,
    prizeAmount: digits,
    startDate: tournament.startDate,
    registrationDeadline: tournament.registrationDeadline,
    teamCap: String(tournament.teamCap),
    region: tournament.region,
    status: tournament.status,
  };
}

export function formValuesToCreateInput(values: CreateTournamentFormValues): CreateTournamentInput {
  return {
    name: values.name.trim(),
    game: values.game,
    format: values.format,
    prizePool: formatPrizePool(values.prizeAmount, values.prizeCurrency),
    startDate: values.startDate,
    registrationDeadline: values.registrationDeadline,
    teamCap: Number.parseInt(values.teamCap, 10),
    region: values.region,
    status: values.status,
  };
}

export function buildTournamentFromInput(input: CreateTournamentInput): AdminTournament {
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return {
    id: `${slug || "tournament"}-${crypto.randomUUID().slice(0, 6)}`,
    name: input.name,
    game: input.game,
    status: input.status ?? "Draft",
    prizePool: input.prizePool,
    startDate: input.startDate,
    registrationDeadline: input.registrationDeadline,
    teamsRegistered: 0,
    teamCap: input.teamCap,
    format: input.format,
    region: input.region,
  };
}

export function validateCreateTournamentForm(
  values: CreateTournamentFormValues,
): CreateTournamentFieldErrors {
  const errors: CreateTournamentFieldErrors = {};
  const teamCap = Number.parseInt(values.teamCap, 10);

  if (!values.name.trim()) {
    errors.name = "Tournament name is required.";
  }

  if (!values.prizeAmount.trim() || prizeDigitsToNumber(values.prizeAmount) <= 0) {
    errors.prizeAmount = "Enter a prize pool amount greater than zero.";
  }

  if (!values.startDate) {
    errors.startDate = "Start date is required.";
  }

  if (!values.registrationDeadline) {
    errors.registrationDeadline = "Registration deadline is required.";
  }

  if (
    values.startDate &&
    values.registrationDeadline &&
    values.registrationDeadline > values.startDate
  ) {
    errors.registrationDeadline = "Deadline must be on or before the start date.";
  }

  if (!values.teamCap.trim()) {
    errors.teamCap = "Team cap is required.";
  } else if (Number.isNaN(teamCap) || teamCap < 4 || teamCap > 64) {
    errors.teamCap = "Team cap must be between 4 and 64.";
  }

  return errors;
}

export function hasFormErrors(errors: CreateTournamentFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function formatBracketAvailability(tournament: AdminTournament, teamCount: number): string {
  if (
    !isSingleEliminationFormat(tournament.format) &&
    !isDoubleEliminationFormat(tournament.format)
  ) {
    return `Bracket manager supports single and double elimination only. This event uses ${tournament.format}.`;
  }
  if (teamCount < 2) {
    return `At least 2 teams are required to generate a bracket (currently ${teamCount}).`;
  }
  if ((teamCount & (teamCount - 1)) !== 0) {
    const lower = Math.pow(2, Math.floor(Math.log2(teamCount)));
    const upper = lower * 2;
    return `Team count must be a power of 2 (e.g. ${lower} or ${upper}). Currently ${teamCount}.`;
  }
  return "";
}
