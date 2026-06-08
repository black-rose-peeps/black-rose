import type { MockTeam, TournamentStatus } from "@/lib/mock-data";

export type ParticipantRegistration = MockTeam;

export interface ParticipantRow extends MockTeam {
  tournamentName: string;
  tournamentStatus: TournamentStatus;
}
