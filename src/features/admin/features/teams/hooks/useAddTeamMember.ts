import { useCallback, useState } from "react";
import { addMemberToTeam } from "../services/teams.service";
import type { AddTeamMemberInput, Team } from "../types";

export function useAddTeamMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: AddTeamMemberInput): Promise<Team> => {
    setIsSubmitting(true);
    setError(null);
    try {
      return await addMemberToTeam(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add member.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { submit, isSubmitting, error, resetError };
}
