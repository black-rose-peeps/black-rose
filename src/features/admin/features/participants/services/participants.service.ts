/**
 * Participants (tournament registrations) — backed by registrations store.
 */

import {
  fetchAllRegistrations,
  updateRegistrationStatus,
} from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { getTournamentByIdSync } from "@/features/admin/features/tournaments/services/tournaments.service";
import type { MockTeam } from "@/lib/mock-data";
import type { ParticipantRow } from "../types";

export async function fetchParticipants(): Promise<ParticipantRow[]> {
  const registrations = await fetchAllRegistrations();
  return registrations.map((registration) => ({
    ...registration,
    tournamentName:
      getTournamentByIdSync(registration.tournamentId)?.name ?? registration.tournamentId,
  }));
}

export async function setParticipantStatus(
  registrationId: string,
  status: MockTeam["status"],
): Promise<ParticipantRow> {
  const updated = await updateRegistrationStatus(registrationId, status);
  return {
    ...updated,
    tournamentName:
      getTournamentByIdSync(updated.tournamentId)?.name ?? updated.tournamentId,
  };
}
