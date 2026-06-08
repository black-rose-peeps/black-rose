import { useCallback, useState } from "react";
import { updateMemberVerificationStatus } from "../services/members.service";
import type { AdminMember, MemberVerificationStatus } from "../types";

export function useUpdateMemberVerification() {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateVerification = useCallback(
    async (memberId: string, status: MemberVerificationStatus): Promise<AdminMember> => {
      setUpdatingId(memberId);
      setError(null);
      try {
        return await updateMemberVerificationStatus(memberId, status);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update verification status.";
        setError(message);
        throw err;
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  const resetError = useCallback(() => setError(null), []);

  return { updatingId, error, updateVerification, resetError };
}
