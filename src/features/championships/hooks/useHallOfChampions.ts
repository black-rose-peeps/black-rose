import { useEffect, useState } from "react";
import { fetchHallOfChampions } from "../services/hall-of-champions.service";
import type { HallOfChampionRecord } from "../types";

/** Dev-only stub injected when the local DB has no champion rows. Remove once
 *  prod data is seeded and verifiable locally. */
const DEV_STUB_CHAMPION: HallOfChampionRecord = {
  id: "dev-stub-zorvex",
  tournamentId: "dev-tournament-001",
  tournamentName: "Black Rose x VALORANT PH Community Tournament",
  game: "Valorant",
  region: "SEA",
  format: "Single Elimination",
  participationType: "team",
  prizePool: "₱30,000",
  teamName: "Zorvex",
  teamTag: "ZX",
  teamId: null,
  mvp: null,
  crownedAt: "2026-07-11",
  portraitUrl: "/Zorvex_Champ_Blackrose_x_Valorant.jpg",
  story: null,
  crownVariant: "grand",
  venueType: "onsite" as const,
  venueLocation: "Robinsons Place Antipolo, Antipolo City",
};

export function useHallOfChampions() {
  const [champions, setChampions] = useState<HallOfChampionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const rows = await fetchHallOfChampions();
        // In local dev the DB is empty — inject a stub so the portrait wiring
        // is verifiable without needing prod data.
        const result = import.meta.env.DEV && rows.length === 0 ? [DEV_STUB_CHAMPION] : rows;
        if (!cancelled) setChampions(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load champions");
          setChampions([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { champions, isLoading, error };
}
