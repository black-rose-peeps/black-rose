import { useCallback, useState } from "react";
import { resyncRegistrationsForTeam } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { updateTeam } from "../services/teams.service";
import type { CreateTeamInput, Team } from "../types";

export function useUpdateTeam() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (teamId: string, input: Pick<CreateTeamInput, "name" | "tag" | "game">): Promise<Team> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const team = await updateTeam(teamId, input);
        await resyncRegistrationsForTeam(teamId);
        return team;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update team.";
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
