import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { createAdminSilentRefetch } from "@/lib/admin-realtime-refetch";
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

  const debouncedRefetch = useMemo(
    () => createAdminSilentRefetch(refetch),
    [refetch],
  );

  useEffect(() => {
    void refetch();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("admin-teams-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => {
        debouncedRefetch({ silent: true });
      })
      .subscribe();

    function handleFocus() {
      debouncedRefetch({ silent: true });
    }
    window.addEventListener("focus", handleFocus);

    return () => {
      debouncedRefetch.cancel();
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch, debouncedRefetch]);

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
