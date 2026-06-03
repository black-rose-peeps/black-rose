import { useCallback, useState } from "react";
import { addTeamToTournament } from "../services/tournament-registrations.service";
import type { MockTeam } from "@/lib/mock-data";

export function useAddTeamToTournament(tournamentId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (rosterTeamId: string): Promise<MockTeam> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await addTeamToTournament(tournamentId, rosterTeamId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add team.";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [tournamentId],
  );

  const resetError = useCallback(() => setError(null), []);

  return { submit, isSubmitting, error, resetError };
}
