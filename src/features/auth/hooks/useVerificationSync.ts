import { useCallback, useEffect, useRef, useState } from "react";
import { refreshVerificationFromDiscord } from "../functions/refresh-verification-from-discord";
import { syncSessionFromDatabase } from "../services/sync-session";
import { getSession } from "../store/session";
import { hasFullMemberAccess } from "../utils/routes";
import { useMemberVerificationRealtime } from "./useMemberVerificationRealtime";

/** DB-only fallback if Realtime is unavailable. */
const FALLBACK_POLL_INTERVAL_MS = 60_000;

const NOT_VERIFIED_YET_MESSAGE =
  "ROSE role not detected yet. React in #tourna-roles on Discord, wait a few seconds, then try again.";

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

  const applySessionUpdate = useCallback(async (): Promise<boolean> => {
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

  const syncVerificationFromDatabase = useCallback(async () => {
    try {
      await applySessionUpdate();
    } catch {
      // Background refresh — avoid noisy errors on poll/realtime.
    }
  }, [applySessionUpdate]);

  const syncVerification = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setCheckError("Please sign in again.");
      return false;
    }

    setIsChecking(true);
    setCheckError(null);

    try {
      await refreshVerificationFromDiscord({ data: { memberId: session.id } });
      const verified = await applySessionUpdate();
      if (!verified) {
        setCheckError(NOT_VERIFIED_YET_MESSAGE);
      }
      return verified;
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
    void syncVerificationFromDatabase();
  });

  useEffect(() => {
    void syncVerificationFromDatabase();
  }, [syncVerificationFromDatabase]);

  useEffect(() => {
    if (!poll) return;

    const intervalId = window.setInterval(() => {
      void syncVerificationFromDatabase();
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [poll, syncVerificationFromDatabase]);

  return { syncVerification, isChecking, checkError };
}
