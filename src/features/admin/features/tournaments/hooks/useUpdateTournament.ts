import { useCallback, useState } from "react";
import { updateTournament } from "../services/tournaments.service";
import type { AdminTournament, CreateTournamentInput } from "../types";

export function useUpdateTournament() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (id: string, input: CreateTournamentInput): Promise<AdminTournament> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await updateTournament(id, input);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update tournament.";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const resetError = useCallback(() => setError(null), []);

  return { submit, isSubmitting, error, resetError };
}
