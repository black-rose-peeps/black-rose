import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { syncSessionFromDatabase } from "@/features/auth/services/sync-session";
import { getPostAuthPath, hasFullMemberAccess } from "@/features/auth/utils/routes";
import { getSession } from "@/features/auth/store/session";
import type { AppUser } from "@/features/auth/types";

interface SyncedMemberSessionState {
  session: AppUser | null;
  isSyncing: boolean;
}

/** Sync member session from DB on mount; redirect when unauthenticated or wrong role. */
export function useSyncedMemberSession(): SyncedMemberSessionState {
  const navigate = useNavigate();
  const [session, setSession] = useState<AppUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const current = getSession();
      if (!current) {
        navigate({ to: "/login" });
        return;
      }

      try {
        const updated = await syncSessionFromDatabase();
        if (cancelled) return;

        if (!updated) {
          navigate({ to: "/login" });
          return;
        }

        if (!hasFullMemberAccess(updated.role)) {
          navigate({ to: getPostAuthPath(updated.role) });
          return;
        }

        setSession(updated);
      } catch {
        if (cancelled) return;
        if (!hasFullMemberAccess(current.role)) {
          navigate({ to: getPostAuthPath(current.role) });
          return;
        }
        setSession(current);
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return { session, isSyncing };
}
