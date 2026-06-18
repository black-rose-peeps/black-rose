import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { createDebouncedRefetch } from "@/lib/debounce-refetch";
import { fetchTeams } from "../services/teams.service";
import type { Team } from "../types";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await fetchTeams();
      setTeams(data);
      setError(null);
    } catch (err) {
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : "Failed to load teams.");
      }
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
    const debouncedRefetch = createDebouncedRefetch(refetch, 3000);

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("admin-teams-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => {
        debouncedRefetch({ silent: true });
      })
      .subscribe();

    return () => {
      debouncedRefetch.cancel();
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  useEffect(() => {
    const debouncedRefetch = createDebouncedRefetch(refetch, 3000);
    function handleFocus() {
      debouncedRefetch({ silent: true });
    }
    window.addEventListener("focus", handleFocus);
    return () => {
      debouncedRefetch.cancel();
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch]);

  const prependTeam = useCallback((team: Team) => {
    setTeams((prev) => [team, ...prev]);
  }, []);

  const updateTeam = useCallback((team: Team) => {
    setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)));
  }, []);

  const removeTeam = useCallback((teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  }, []);

  return { teams, isLoading, error, refetch, prependTeam, updateTeam, removeTeam };
}
