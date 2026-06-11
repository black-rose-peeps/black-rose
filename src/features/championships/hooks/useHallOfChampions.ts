import { useEffect, useState } from "react";
import { fetchHallOfChampions } from "../services/hall-of-champions.service";
import type { HallOfChampionRecord } from "../types";

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
        if (!cancelled) setChampions(rows);
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
