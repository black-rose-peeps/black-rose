import { useCallback, useState } from "react";
import { resyncRegistrationsForTeam } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import {
  addMemberToTeam,
  addMembersToTeam,
  type AddMembersToTeamResult,
} from "../services/teams.service";
import type { AddTeamMemberInput, Team } from "../types";

async function resyncTeamRoster(teamId: string) {
  try {
    await resyncRegistrationsForTeam(teamId);
  } catch (resyncErr) {
    console.error("Roster resync failed after adding member:", resyncErr);
  }
}

export function useAddTeamMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: AddTeamMemberInput): Promise<Team> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const team = await addMemberToTeam(input);
      await resyncTeamRoster(input.teamId);
      return team;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add member.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const submitMany = useCallback(
    async (teamId: string, memberIds: string[]): Promise<AddMembersToTeamResult> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await addMembersToTeam(teamId, memberIds);
        if (result.added.length > 0) {
          await resyncTeamRoster(teamId);
        }
        if (result.added.length === 0 && result.failed.length > 0) {
          setError(result.failed.map((failure) => failure.message).join(" "));
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add members.";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const resetError = useCallback(() => setError(null), []);

  return { submit, submitMany, isSubmitting, error, resetError };
}
