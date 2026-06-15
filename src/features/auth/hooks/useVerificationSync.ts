import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionFromDatabase } from "../services/sync-session";
import { getSession } from "../store/session";
import { hasFullMemberAccess } from "../utils/routes";
import { useMemberVerificationRealtime } from "./useMemberVerificationRealtime";

/** DB-only fallback if Realtime is unavailable. */
const FALLBACK_POLL_INTERVAL_MS = 60_000;

interface UseVerificationSyncOptions {
  /** Called when DB status becomes Verified. */
  onVerified: () => void;
  /** Poll Supabase as a fallback while the user waits on the waitlist. */
  poll?: boolean;
}

export function useVerificationSync({ onVerified, poll = true }: UseVerificationSyncOptions) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  const applySessionUpdate = useCallback(async () => {
    const session = getSession();
    if (!session) return false;

    const updated = await syncSessionFromDatabase();
    if (!updated) return false;

    if (hasFullMemberAccess(updated.role)) {
      onVerifiedRef.current();
      return true;
    }

    return false;
  }, []);

  const syncVerification = useCallback(async () => {
    setIsChecking(true);
    setCheckError(null);

    try {
      return await applySessionUpdate();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not refresh verification status.";
      setCheckError(message);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [applySessionUpdate]);

  const session = getSession();
  useMemberVerificationRealtime(session?.id ?? null, () => {
    void applySessionUpdate();
  });

  useEffect(() => {
    void syncVerification();
  }, [syncVerification]);

  useEffect(() => {
    if (!poll) return;

    const intervalId = window.setInterval(() => {
      void syncVerification();
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [poll, syncVerification]);

  return { syncVerification, isChecking, checkError };
}
