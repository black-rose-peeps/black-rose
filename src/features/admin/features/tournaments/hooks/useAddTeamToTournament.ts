import { useCallback, useState } from "react";
import {
  addTeamToTournament,
  addTeamsToTournament,
  type AddTeamsToTournamentResult,
} from "../services/tournament-registrations.service";
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

  const submitMany = useCallback(
    async (rosterTeamIds: string[]): Promise<AddTeamsToTournamentResult> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await addTeamsToTournament(tournamentId, rosterTeamIds);
        if (result.added.length === 0 && result.failed.length > 0) {
          setError(result.failed.map((f) => f.message).join(" "));
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add teams.";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [tournamentId],
  );

  const resetError = useCallback(() => setError(null), []);

  return { submit, submitMany, isSubmitting, error, resetError };
}
