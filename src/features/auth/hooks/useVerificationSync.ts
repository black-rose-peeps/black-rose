import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionFromDatabase } from "../services/sync-session";
import { getSession } from "../store/session";
import { hasFullMemberAccess } from "../utils/routes";

const POLL_INTERVAL_MS = 10_000;

interface UseVerificationSyncOptions {
  /** Called when DB status becomes Verified. */
  onVerified: () => void;
  /** Poll automatically while the user waits on the waitlist. */
  poll?: boolean;
}

export function useVerificationSync({ onVerified, poll = true }: UseVerificationSyncOptions) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  const syncVerification = useCallback(async () => {
    const session = getSession();
    if (!session) return false;

    setIsChecking(true);
    setCheckError(null);

    try {
      const updated = await syncSessionFromDatabase();
      if (!updated) return false;

      if (hasFullMemberAccess(updated.role)) {
        onVerifiedRef.current();
        return true;
      }

      return false;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not refresh verification status.";
      setCheckError(message);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!poll) return;

    void syncVerification();
    const intervalId = window.setInterval(() => {
      void syncVerification();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [poll, syncVerification]);

  return { syncVerification, isChecking, checkError };
}
