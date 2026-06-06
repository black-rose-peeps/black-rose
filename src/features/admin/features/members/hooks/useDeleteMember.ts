import { useCallback, useState } from "react";
import { deleteMember } from "../services/members.service";

export function useDeleteMember() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteMember(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete member.";
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { submit, isDeleting, error, resetError };
}
