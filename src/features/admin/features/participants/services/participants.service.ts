/**
 * Participants (tournament registrations) — backed by registrations store.
 */

import {
  fetchAllRegistrations,
  fetchRegistrationTournamentHistory,
  updateRegistrationStatus,
} from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import {
  fetchTournamentById,
  fetchTournaments,
} from "@/features/admin/features/tournaments/services/tournaments.service";
import type { MockTeam } from "@/lib/mock-data";
import type { ParticipantRow, RegistrationHistoryEntry } from "../types";

export type { RegistrationHistoryEntry };

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

export async function fetchParticipantTournamentHistory(
  registration: Pick<MockTeam, "id" | "rosterTeamId" | "memberUserId">,
): Promise<RegistrationHistoryEntry[]> {
  return fetchRegistrationTournamentHistory(
    registration.id,
    registration.rosterTeamId,
    registration.memberUserId,
  );
}

export async function setParticipantStatuses(
  registrationIds: string[],
  status: MockTeam["status"],
): Promise<{ updated: ParticipantRow[]; failed: string[] }> {
  const uniqueIds = [...new Set(registrationIds)];
  const updated: ParticipantRow[] = [];
  const failed: string[] = [];

  await Promise.all(
    uniqueIds.map(async (registrationId) => {
      try {
        const row = await setParticipantStatus(registrationId, status);
        updated.push(row);
      } catch {
        failed.push(registrationId);
      }
    }),
  );

  return { updated, failed };
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
