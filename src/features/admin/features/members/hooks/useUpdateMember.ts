import { useCallback, useState } from "react";
import { updateMember } from "../services/members.service";
import type { AdminMember, CreateMemberInput } from "../types";

export function useUpdateMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (id: string, input: CreateMemberInput): Promise<AdminMember> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await updateMember(id, input);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update member.";
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
