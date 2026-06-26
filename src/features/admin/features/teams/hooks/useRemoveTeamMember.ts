import { useCallback, useState } from "react";
import { removeMemberFromTeam, rosterActorFromAdminConsole } from "../services/teams.service";
import type { Team } from "../types";

export function useRemoveTeamMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (teamId: string, userId: string): Promise<Team> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const team = await removeMemberFromTeam(teamId, userId, rosterActorFromAdminConsole());
      return team;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove member.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { submit, isSubmitting, error, resetError };
}
