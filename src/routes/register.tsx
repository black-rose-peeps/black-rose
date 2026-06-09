import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "@/features/auth/store/session";
import { syncSessionFromDatabase } from "@/features/auth/services/sync-session";
import { getPostAuthPath } from "@/features/auth/utils/routes";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { DiscordButton } from "@/features/auth/components/DiscordButton";
import { isDiscordOAuthConfigured, startDiscordOAuth } from "@/features/auth/services/discord";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — Black Rose" },
      {
        name: "description",
        content:
          "Create your Black Rose account via Discord to build teams and compete in community tournaments.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [navigate]);

  function handleRegister() {
    setError(null);
    if (!isDiscordOAuthConfigured()) {
      setError(
        "Discord sign-in is not configured. Set VITE_DISCORD_CLIENT_ID in your environment.",
      );
      return;
    }
    startDiscordOAuth();
  }

  return (
    <AuthShell
      headline="FIGHT AS ONE"
      subheadline="Create your Black Rose account to build teams, register for tournaments, and rise through the brackets."
    >
      {/* Heading */}
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-px w-10 bg-border" />
          New Recruit
        </div>
        <h2 className="font-display text-4xl tracking-display">Create Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Black Rose accounts are tied to your Discord identity. No separate password needed.
        </p>
      </div>

      {/* What you get */}
      <ul className="mb-8 flex flex-col gap-2.5">
        {[
          "Join or create competitive teams",
          "Register for tournaments in one click",
          "Receive announcements and bracket updates",
        ].map((item) => (
          <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 bg-white/40" />
            {item}
          </li>
        ))}
      </ul>

      {/* Discord CTA */}
      <div className="flex flex-col gap-4">
        <DiscordButton onClick={handleRegister} label="Continue with Discord" />
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
        <p className="text-center text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          You will be redirected to Discord to authorize access.
          <br />
          We only request your username and email.
        </p>
      </div>

      {/* Divider */}
      <div className="my-8 h-px bg-border" />

      {/* Footer link */}
      <p className="text-center text-xs text-muted-foreground">
        Already enlisted?{" "}
        <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
}
