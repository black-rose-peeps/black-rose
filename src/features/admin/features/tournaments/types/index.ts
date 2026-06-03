import type { MockTournament, TournamentStatus } from "@/lib/mock-data";
import type { TournamentFormat } from "@/features/tournaments/constants/formats";
import type { TournamentGame } from "@/features/tournaments/types";
import type { PrizeCurrency } from "@/lib/currency";

export type AdminTournament = MockTournament;

export interface CreateTournamentInput {
  name: string;
  game: TournamentGame;
  format: TournamentFormat;
  prizePool: string;
  startDate: string;
  registrationDeadline: string;
  teamCap: number;
  region: string;
  status?: TournamentStatus;
}

export interface CreateTournamentFormValues {
  name: string;
  game: TournamentGame;
  format: TournamentFormat;
  prizeCurrency: PrizeCurrency;
  prizeAmount: string;
  startDate: string;
  registrationDeadline: string;
  teamCap: string;
  region: string;
  status: TournamentStatus;
}

export type CreateTournamentFieldErrors = Partial<Record<keyof CreateTournamentFormValues, string>>;
