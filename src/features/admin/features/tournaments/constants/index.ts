import { TOURNAMENT_FORMATS } from "@/features/tournaments/constants/formats";
import type { CreateTournamentFormValues } from "../types";
import type { TournamentStatus } from "@/lib/mock-data";
import type { TournamentGame } from "@/features/tournaments/types";

export { TOURNAMENT_FORMATS };

export const TOURNAMENT_GAMES: TournamentGame[] = [
  "Valorant",
  "League of Legends",
  "Teamfight Tactics",
];

export const TOURNAMENT_REGIONS = ["PH", "SEA", "APAC", "Global"] as const;

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
};
