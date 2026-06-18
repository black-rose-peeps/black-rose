import { useEffect, useState } from "react";
import type { AppUser } from "@/features/auth/types";
import { getSession, subscribeToSessionChanges } from "@/features/auth/store/session";

/** Reactive client session — updates when login/logout happens in any tab. */
export function useMemberSession(): AppUser | null {
  const [session, setSession] = useState(() => getSession());

  useEffect(() => {
    function refresh() {
      setSession(getSession());
    }

    refresh();
    return subscribeToSessionChanges(refresh);
  }, []);

  return session;
}
