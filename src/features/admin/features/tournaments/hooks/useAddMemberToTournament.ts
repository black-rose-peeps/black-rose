import { useCallback, useState } from "react";
import {
  addMemberToTournament,
  addMembersToTournament,
  type AddMembersToTournamentResult,
} from "../services/tournament-registrations.service";
import type { MockTeam } from "@/lib/mock-data";

export function useAddMemberToTournament(tournamentId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (memberUserId: string): Promise<MockTeam> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await addMemberToTournament(tournamentId, memberUserId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add player.";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [tournamentId],
  );

  const submitMany = useCallback(
    async (memberUserIds: string[]): Promise<AddMembersToTournamentResult> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await addMembersToTournament(tournamentId, memberUserIds);
        if (result.added.length === 0 && result.failed.length > 0) {
          setError(result.failed.map((f) => f.message).join(" "));
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add players.";
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
