import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "@/features/auth/store/session";
import { syncSessionFromDatabase } from "@/features/auth/services/sync-session";
import { getPostAuthPath } from "@/features/auth/utils/routes";
import { AdminConsoleLogin } from "@/features/admin/auth/AdminConsoleLogin";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { DiscordButton } from "@/features/auth/components/DiscordButton";
import { isDiscordOAuthConfigured, startDiscordOAuth } from "@/features/auth/services/discord";

type LoginSearch = {
  console?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    console: typeof search.console === "string" ? search.console : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Join — Black Rose" },
      {
        name: "description",
        content: "Continue with Discord to join Black Rose — new accounts are created automatically.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { console: consoleParam } = Route.useSearch();
  const isAdminConsole = consoleParam === "1";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminConsole) return;

    let cancelled = false;

    async function redirectIfLoggedIn() {
      const session = getSession();
      if (!session) return;

      try {
        const updated = await syncSessionFromDatabase();
        if (cancelled || !updated) return;
        navigate({ to: getPostAuthPath(updated.role), replace: true });
      } catch {
        if (cancelled) return;
        navigate({ to: getPostAuthPath(session.role), replace: true });
      }
    }

    void redirectIfLoggedIn();

    return () => {
      cancelled = true;
    };
  }, [navigate, isAdminConsole]);

  function handleDiscordAuth() {
    setError(null);
    if (!isDiscordOAuthConfigured()) {
      setError(
        "Discord sign-in is not configured. Set VITE_DISCORD_CLIENT_ID in your environment.",
      );
      return;
    }
    startDiscordOAuth();
  }

  if (isAdminConsole) {
    return (
      <AuthShell
        headline="Operations"
        subheadline="Tournament administrators sign in with credentials created in the admin panel."
      >
        <AdminConsoleLogin
          onBack={() => {
            navigate({ to: "/login", search: {}, replace: true });
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      headline="FIGHT AS ONE"
      subheadline="One Discord sign-in for new and returning members — build teams, register for tournaments, and track your competitive journey."
    >
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-3 font-tech text-label-readable uppercase text-muted-foreground">
          <span className="h-px w-10 bg-border" />
          Member Access
        </div>
        <h2 className="font-display text-4xl tracking-display">Join Black Rose</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Black Rose uses Discord for authentication. First-time sign-in creates your account
          automatically — no separate registration step.
        </p>
      </div>

      <ul className="mb-8 flex flex-col gap-2.5">
        {[
          "Join or create competitive teams",
          "Register for community tournaments",
          "Get bracket updates and announcements",
        ].map((item) => (
          <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 bg-white/40" />
            {item}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4">
        <DiscordButton onClick={handleDiscordAuth} label="Continue with Discord" />
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
        <p className="text-center font-tech text-label-readable uppercase text-muted-foreground">
          You will be redirected to Discord to authorize access.
        </p>
      </div>

      <div className="my-8 h-px bg-border" />

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/" className="text-foreground underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
