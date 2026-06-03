import { formatPrizePool, prizeDigitsToNumber } from "@/lib/currency";
import {
  isDoubleEliminationFormat,
  isSingleEliminationFormat,
} from "@/features/tournaments/constants/formats";
import type { AdminTournament, CreateTournamentFormValues, CreateTournamentInput } from "../types";
import type { CreateTournamentFieldErrors } from "../types";

export const BRACKET_TEAM_COUNT_SINGLE = 16;
export const BRACKET_TEAM_COUNT_DOUBLE = 8;

export function requiredBracketTeamCount(format: string): number | null {
  if (isSingleEliminationFormat(format)) return BRACKET_TEAM_COUNT_SINGLE;
  if (isDoubleEliminationFormat(format)) return BRACKET_TEAM_COUNT_DOUBLE;
  return null;
}

export function supportsBracketManager(format: string, teamCount: number): boolean {
  const required = requiredBracketTeamCount(format);
  return required !== null && teamCount === required;
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
  const required = requiredBracketTeamCount(tournament.format);
  if (required === null) {
    return `Bracket manager supports single and double elimination only. This event uses ${tournament.format}.`;
  }
  if (teamCount !== required) {
    const label = isDoubleEliminationFormat(tournament.format)
      ? "Double elimination"
      : "Single elimination";
    return `${label} bracket manager requires exactly ${required} teams (currently ${teamCount}).`;
  }
  return "";
}
