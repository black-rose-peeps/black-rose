import { useCallback, useEffect, useState } from "react";
import { fetchTeams } from "../services/teams.service";
import type { Team } from "../types";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTeams();
      setTeams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
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
