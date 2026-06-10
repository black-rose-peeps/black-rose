import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ensureAdminConsoleSession } from "./admin-session";

/** Client-side guard — admin session lives in localStorage, so SSR cannot validate it. */
export function AdminAuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const valid = await ensureAdminConsoleSession();
      if (cancelled) return;
      if (valid) {
        setAuthorized(true);
        return;
      }
      navigate({ to: "/login", search: { console: "1" }, replace: true });
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
        <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
          Verifying access…
        </p>
      </div>
    );
  }

  return children;
}
