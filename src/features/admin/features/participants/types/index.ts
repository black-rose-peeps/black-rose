import type { MockTeam, TournamentStatus } from "@/lib/mock-data";

export type ParticipantRegistration = MockTeam;

export interface ParticipantRow extends MockTeam {
  tournamentName: string;
  tournamentStatus: TournamentStatus | null;
}

export interface RegistrationHistoryEntry {
  registrationId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: TournamentStatus | null;
  registrationDate: string;
  status: MockTeam["status"];
}
