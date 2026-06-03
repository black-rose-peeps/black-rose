import { useCallback, useState } from "react";
import { createTeam } from "../services/teams.service";
import type { CreateTeamInput, Team } from "../types";

export function useCreateTeam() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: CreateTeamInput): Promise<Team> => {
    setIsSubmitting(true);
    setError(null);
    try {
      return await createTeam(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create team.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { submit, isSubmitting, error, resetError };
}
