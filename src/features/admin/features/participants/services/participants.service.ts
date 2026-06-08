/**
 * Participants (tournament registrations) — backed by registrations store.
 */

import {
  fetchAllRegistrations,
  updateRegistrationStatus,
} from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import {
  fetchTournamentById,
  fetchTournaments,
} from "@/features/admin/features/tournaments/services/tournaments.service";
import type { MockTeam } from "@/lib/mock-data";
import type { ParticipantRow } from "../types";

export async function fetchParticipants(): Promise<ParticipantRow[]> {
  const [registrations, tournaments] = await Promise.all([
    fetchAllRegistrations(),
    fetchTournaments(),
  ]);

  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));

  return registrations.map((registration) => {
    const tournament = tournamentById.get(registration.tournamentId);
    return {
      ...registration,
      tournamentName: tournament?.name ?? "Unknown tournament",
      tournamentStatus: tournament?.status ?? null,
    };
  });
}

export async function setParticipantStatus(
  registrationId: string,
  status: MockTeam["status"],
): Promise<ParticipantRow> {
  const updated = await updateRegistrationStatus(registrationId, status);

  try {
    const tournament = await fetchTournamentById(updated.tournamentId);
    return {
      ...updated,
      tournamentName: tournament?.name ?? "Unknown tournament",
      tournamentStatus: tournament?.status ?? null,
    };
  } catch (err) {
    console.warn("[participants] Failed to load tournament name after status update:", err);
    return {
      ...updated,
      tournamentName: "Unknown tournament",
      tournamentStatus: null,
    };
  }
}
