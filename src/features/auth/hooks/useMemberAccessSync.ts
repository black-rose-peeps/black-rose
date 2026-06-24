import { useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { syncMemberAccessFromDatabase } from "../services/sync-session";
import { getSession } from "../store/session";
import { hasFullMemberAccess } from "../utils/routes";
import { useMemberVerificationRealtime } from "./useMemberVerificationRealtime";
import { useMemberSession } from "./useMemberSession";

const FALLBACK_POLL_INTERVAL_MS = 300_000;

/** Redirect verified members to the waitlist if the Discord bot revokes their ROSE role. */
export function useMemberAccessSync() {
  const navigate = useNavigate();
  const session = useMemberSession();
  const memberId = session?.id ?? null;
  const memberRole = session?.role ?? null;

  const checkAccess = useCallback(async () => {
    const current = getSession();
    if (!current || !hasFullMemberAccess(current.role)) return;

    try {
      const updated = await syncMemberAccessFromDatabase();
      if (!updated) return;
      if (!hasFullMemberAccess(updated.role)) {
        navigate({ to: "/waitlist", replace: true });
      }
    } catch (err) {
      console.warn("[auth] Member access sync failed:", err);
    }
  }, [navigate]);

  useMemberVerificationRealtime(memberId, () => {
    void checkAccess();
  });

  useEffect(() => {
    if (!memberId || !memberRole || !hasFullMemberAccess(memberRole)) return;

    void checkAccess();
    const intervalId = window.setInterval(() => {
      void checkAccess();
    }, FALLBACK_POLL_INTERVAL_MS);
    window.addEventListener("focus", checkAccess);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkAccess);
    };
  }, [checkAccess, memberId, memberRole]);
}
