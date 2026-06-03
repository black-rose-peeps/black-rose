import { useCallback, useState } from "react";
import { createMember } from "../services/members.service";
import type { AdminMember, CreateMemberInput } from "../types";

export function useCreateMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: CreateMemberInput): Promise<AdminMember> => {
    setIsSubmitting(true);
    setError(null);
    try {
      return await createMember(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create member.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { submit, isSubmitting, error, resetError };
}
