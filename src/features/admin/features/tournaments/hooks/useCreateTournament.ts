import { useCallback, useState } from "react";
import { createTournament } from "../services/tournaments.service";
import type { AdminTournament, CreateTournamentInput } from "../types";

export function useCreateTournament() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: CreateTournamentInput): Promise<AdminTournament> => {
    setIsSubmitting(true);
    setError(null);
    try {
      return await createTournament(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create tournament.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { submit, isSubmitting, error, resetError };
}
