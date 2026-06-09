import { useCallback, useState } from "react";
import { deleteTeam } from "../services/teams.service";

export function useDeleteTeam() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (teamId: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteTeam(teamId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete team.";
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { submit, isDeleting, error, resetError };
}
