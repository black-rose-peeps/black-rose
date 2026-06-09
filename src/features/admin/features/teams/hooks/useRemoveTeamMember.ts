import { useCallback, useState } from "react";
import { resyncRegistrationsForTeam } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { removeMemberFromTeam } from "../services/teams.service";
import type { Team } from "../types";

export function useRemoveTeamMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (teamId: string, userId: string): Promise<Team> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const team = await removeMemberFromTeam(teamId, userId);
      try {
        await resyncRegistrationsForTeam(teamId);
      } catch (resyncErr) {
        console.error("Roster resync failed after removing member:", resyncErr);
        setError("Member removed but roster sync to tournaments failed.");
      }
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
