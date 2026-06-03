import type { MockTeam } from "@/lib/mock-data";

export type ParticipantRegistration = MockTeam;

export interface ParticipantRow extends MockTeam {
  tournamentName: string;
}
