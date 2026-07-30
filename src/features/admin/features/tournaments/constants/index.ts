import { TOURNAMENT_FORMATS } from "@/features/tournaments/constants/formats";
import type { CreateTournamentFormValues } from "../types";
import type { TournamentStatus } from "@/lib/mock-data";

export { TOURNAMENT_FORMATS };

// Legacy games - will be replaced with dynamic games from database
export const TOURNAMENT_GAMES: string[] = [
  "Valorant",
  "League of Legends",
  "Teamfight Tactics",
  "Where Winds Meet",
  "Marvel Rivals",
];

export const TOURNAMENT_REGIONS = ["PH", "SEA", "APAC", "Global"] as const;

/** Public tournament hero blurb — keep in sync with DB check constraint. */
export const TOURNAMENT_DESCRIPTION_MAX_LENGTH = 280;

/** Max length for optional official ruleset URL. */
export const TOURNAMENT_RULES_URL_MAX_LENGTH = 500;

export const TOURNAMENT_RULES_FILE_MAX_BYTES = 10 * 1024 * 1024;

export const TOURNAMENT_RULES_FILE_EXTENSIONS = ["pdf", "doc", "docx"] as const;

export const TOURNAMENT_RULES_FILE_ACCEPT = ".pdf,.doc,.docx";

export const ADMIN_TOURNAMENT_STATUSES: TournamentStatus[] = [
  "Draft",
  "Registration Open",
  "Registration Closed",
  "Live",
];

export const DEFAULT_CREATE_TOURNAMENT_FORM: CreateTournamentFormValues = {
  name: "",
  game: "Valorant",
  format: "Single Elimination",
  prizeCurrency: "PHP",
  prizeAmount: "",
  startDate: "",
  registrationDeadline: "",
  teamCap: "16",
  region: "PH",
  status: "Draft",
  wwmMode: "",
  description: "",
  rulesUrl: "",
};
