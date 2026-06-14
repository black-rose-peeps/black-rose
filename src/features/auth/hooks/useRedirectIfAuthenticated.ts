import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { syncSessionFromDatabase } from "@/features/auth/services/sync-session";
import { getSession, subscribeToSessionChanges } from "@/features/auth/store/session";
import { getPostAuthPath } from "@/features/auth/utils/routes";

/**
 * Redirect away from guest-only routes when a session appears — including when
 * Discord OAuth completes in another browser tab (Discord app flow).
 */
export function useRedirectIfAuthenticated(enabled = true): void {
  const navigate = useNavigate();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function redirectIfLoggedIn() {
      if (redirectingRef.current) return;

      const session = getSession();
      if (!session) return;

      redirectingRef.current = true;

      try {
        const updated = await syncSessionFromDatabase();
        if (cancelled) return;
        navigate({ to: getPostAuthPath(updated?.role ?? session.role), replace: true });
      } catch {
        if (cancelled) return;
        navigate({ to: getPostAuthPath(session.role), replace: true });
      }
    }

    void redirectIfLoggedIn();

    const unsubscribe = subscribeToSessionChanges(() => {
      void redirectIfLoggedIn();
    });

    function handleResume() {
      if (document.visibilityState === "visible") {
        void redirectIfLoggedIn();
      }
    }

    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      cancelled = true;
      redirectingRef.current = false;
      unsubscribe();
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [enabled, navigate]);
}
