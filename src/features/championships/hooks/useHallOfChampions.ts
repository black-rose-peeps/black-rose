import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHallOfChampions } from "../services/hall-of-champions.service";
import { useTournamentList, TOURNAMENTS_QUERY_KEY } from "@/features/tournaments/hooks";
import type { HallOfChampionRecord } from "../types";

/** Dev-only stub injected when the local DB has no champion rows. Remove once
 *  prod data is seeded and verifiable locally. */
const DEV_STUB_CHAMPION: HallOfChampionRecord = {
  id: "dev-stub-zorvex",
  tournamentId: "dev-tournament-001",
  tournamentName: "Black Rose x VALORANT PH Community Tournament",
  game: "Valorant",
  region: "SEA",
  format: "Double Elimination",
  participationType: "team" as const,
  prizePool: "₱10,000",
  teamName: "Zorvex",
  teamTag: "ZRX",
  teamId: null,
  mvp: null,
  crownedAt: "2026-07-11",
  portraitUrl: "/Zorvex_Champ_Blackrose_x_Valorant.jpg",
  tournamentHeaderImage: null,
  story: null,
  crownVariant: "grand",
  venueType: "onsite" as const,
  venueLocation: "Robinsons Place Antipolo, Antipolo City",
};

export function useHallOfChampions() {
  // Use shared tournament data to avoid duplicate fetches
  const { tournaments } = useTournamentList();

  const query = useQuery({
    queryKey: ["hall-of-champions"],
    queryFn: async () => {
      const rows = await fetchHallOfChampions(tournaments);
      // In local dev the DB is empty — inject a stub so the portrait wiring
      // is verifiable without needing prod data.
      return import.meta.env.DEV && rows.length === 0 ? [DEV_STUB_CHAMPION] : rows;
    },
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
  });

  return {
    champions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
