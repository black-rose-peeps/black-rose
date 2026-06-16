import { useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { syncSessionFromDatabase } from "../services/sync-session";
import { getSession } from "../store/session";
import { hasFullMemberAccess } from "../utils/routes";
import { useMemberVerificationRealtime } from "./useMemberVerificationRealtime";

const FALLBACK_POLL_INTERVAL_MS = 120_000;

/** Redirect verified members to the waitlist if the Discord bot revokes their ROSE role. */
export function useMemberAccessSync() {
  const navigate = useNavigate();

  const checkAccess = useCallback(async () => {
    const session = getSession();
    if (!session || !hasFullMemberAccess(session.role)) return;

    try {
      const updated = await syncSessionFromDatabase();
      if (!updated) return;
      if (!hasFullMemberAccess(updated.role)) {
        navigate({ to: "/waitlist", replace: true });
      }
    } catch (err) {
      console.warn("[auth] Member access sync failed:", err);
    }
  }, [navigate]);

  const session = getSession();
  useMemberVerificationRealtime(session?.id ?? null, () => {
    void checkAccess();
  });

  useEffect(() => {
    if (!session || !hasFullMemberAccess(session.role)) return;

    void checkAccess();
    const intervalId = window.setInterval(() => {
      void checkAccess();
    }, FALLBACK_POLL_INTERVAL_MS);
    window.addEventListener("focus", checkAccess);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkAccess);
    };
  }, [checkAccess, session]);
}
