import { useCallback, useState } from "react";
import { createMember } from "../services/members.service";
import type { AdminMember, CreateMemberInput } from "../types";

export function useCreateMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const submit = useCallback(async (input: CreateMemberInput): Promise<AdminMember> => {
    setIsSubmitting(true);
    setError(null);

    try {
      return await createMember(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submit, isSubmitting, error, resetError };
}
