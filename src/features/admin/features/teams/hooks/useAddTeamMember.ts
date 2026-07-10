import { useCallback, useState } from "react";
import {
  addMemberToTeam,
  addMembersToTeam,
  rosterActorFromAdminConsole,
  type AddMembersToTeamResult,
} from "../services/teams.service";
import type { AddTeamMemberInput, Team } from "../types";

export function useAddTeamMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: AddTeamMemberInput): Promise<Team> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const team = await addMemberToTeam(input, rosterActorFromAdminConsole());
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
        const result = await addMembersToTeam(teamId, memberIds, rosterActorFromAdminConsole());
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
