/**
 * Admin tournaments store — replace with Supabase when ready.
 */

import { mockTournaments, type MockTournament } from "@/lib/mock-data";
import type { CreateTournamentInput } from "../types";
import { buildTournamentFromInput } from "../utils";

const MOCK_LATENCY_MS = 200;

let tournamentsStore: MockTournament[] = [...mockTournaments];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTournaments(): Promise<MockTournament[]> {
  await delay(MOCK_LATENCY_MS);
  return [...tournamentsStore].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function fetchTournamentById(id: string): Promise<MockTournament | null> {
  await delay(0);
  return tournamentsStore.find((t) => t.id === id) ?? null;
}

/** Sync read for route loaders that already have the list in memory. */
export function getTournamentByIdSync(id: string): MockTournament | undefined {
  return tournamentsStore.find((t) => t.id === id);
}

export async function createTournament(input: CreateTournamentInput): Promise<MockTournament> {
  await delay(MOCK_LATENCY_MS);

  const tournament = buildTournamentFromInput(input);
  tournamentsStore = [tournament, ...tournamentsStore];
  return tournament;
}

export function syncTournamentTeamCount(tournamentId: string, count: number): void {
  tournamentsStore = tournamentsStore.map((t) =>
    t.id === tournamentId ? { ...t, teamsRegistered: count } : t,
  );
}

export function resetTournamentsStoreForTesting(): void {
  tournamentsStore = [...mockTournaments];
}
