import { useCallback, useState } from "react";
import { resyncRegistrationsForTeam } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { addMemberToTeam } from "../services/teams.service";
import type { AddTeamMemberInput, Team } from "../types";

export function useAddTeamMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: AddTeamMemberInput): Promise<Team> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const team = await addMemberToTeam(input);
      try {
        await resyncRegistrationsForTeam(input.teamId);
      } catch (resyncErr) {
        console.error("Roster resync failed after adding member:", resyncErr);
      }
      return team;
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
