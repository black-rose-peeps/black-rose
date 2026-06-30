import type { MockTournament, TournamentStatus } from "@/lib/mock-data";
import type { TournamentFormat } from "@/features/tournaments/constants/formats";
import type { ParticipationType, TournamentGame, WwmMode } from "@/features/tournaments/types";
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
  participationType: ParticipationType;
  wwmMode?: WwmMode | null;
  description?: string | null;
  rulesUrl?: string | null;
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
  wwmMode: WwmMode | "";
  description: string;
  rulesUrl: string;
}

export type CreateTournamentFieldErrors = Partial<Record<keyof CreateTournamentFormValues, string>>;
