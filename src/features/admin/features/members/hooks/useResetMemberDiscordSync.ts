import { useCallback, useState } from "react";
import { resetMemberDiscordSyncQueue } from "../services/members.service";
import type { AdminMember } from "../types";

export function useResetMemberDiscordSync() {
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetSyncQueue = useCallback(async (memberId: string): Promise<AdminMember> => {
    setResettingId(memberId);
    setError(null);
    try {
      return await resetMemberDiscordSyncQueue(memberId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unpause Discord sync.";
      setError(message);
      throw err;
    } finally {
      setResettingId(null);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { resettingId, error, resetSyncQueue, resetError };
}
