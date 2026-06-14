import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { syncSessionFromDatabase } from "../services/sync-session";
import { getSession } from "../store/session";
import { hasFullMemberAccess } from "../utils/routes";

const POLL_INTERVAL_MS = 10_000;

/** Redirect verified members to the waitlist if an admin revokes their access. */
export function useMemberAccessSync() {
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session || !hasFullMemberAccess(session.role)) return;

    let cancelled = false;

    async function checkAccess() {
      if (cancelled) return;
      try {
        const updated = await syncSessionFromDatabase();
        if (cancelled || !updated) return;
        if (!hasFullMemberAccess(updated.role)) {
          navigate({ to: "/waitlist", replace: true });
        }
      } catch {
        // Ignore transient sync errors; the next poll will retry.
      }
    }

    void checkAccess();
    const intervalId = window.setInterval(() => {
      void checkAccess();
    }, POLL_INTERVAL_MS);
    window.addEventListener("focus", checkAccess);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkAccess);
    };
  }, [navigate]);
}
