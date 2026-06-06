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

  const tournamentNameById = new Map(tournaments.map((t) => [t.id, t.name]));

  return registrations.map((registration) => ({
    ...registration,
    tournamentName:
      tournamentNameById.get(registration.tournamentId) ?? "Unknown tournament",
  }));
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
    };
  } catch (err) {
    console.warn("[participants] Failed to load tournament name after status update:", err);
    return {
      ...updated,
      tournamentName: "Unknown tournament",
    };
  }
}
