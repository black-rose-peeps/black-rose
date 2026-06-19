import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminConsoleLogin } from "@/features/admin/auth/AdminConsoleLogin";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { DiscordButton } from "@/features/auth/components/DiscordButton";
import { useRedirectIfAuthenticated } from "@/features/auth/hooks/useRedirectIfAuthenticated";
import {
  continueDiscordOAuthInBrowser,
  isDiscordOAuthConfigured,
  prepareDiscordOAuth,
} from "@/features/auth/services/discord";
import { DiscordAppLinkDialog } from "@/features/shared/components/DiscordAppLinkDialog";
import { useDiscordAppLink } from "@/features/shared/hooks/useDiscordAppLink";

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
  const {
    pending: discordLinkPending,
    requestDiscordAppLink,
    confirmDiscordAppLink,
    cancelDiscordAppLink,
  } = useDiscordAppLink();

  useRedirectIfAuthenticated(!isAdminConsole);

  function handleDiscordAuth() {
    setError(null);
    if (!isDiscordOAuthConfigured()) {
      setError(
        "Discord sign-in is not configured. Set VITE_DISCORD_CLIENT_ID in your environment.",
      );
      return;
    }
    const { browserFallbackUrl } = prepareDiscordOAuth();
    requestDiscordAppLink(browserFallbackUrl, "Discord sign-in", "oauth");
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
    <>
      <AuthShell
        headline="RISE AS ONE"
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
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            New members land on the waitlist until they react for ROSE in Discord. Verified members
            go straight to the dashboard after sign-in.
          </p>
        </div>

        <div className="my-8 h-px bg-border" />

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="text-foreground underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </AuthShell>

      <DiscordAppLinkDialog
        pending={discordLinkPending}
        onConfirm={confirmDiscordAppLink}
        onCancel={cancelDiscordAppLink}
        onBrowserFallback={continueDiscordOAuthInBrowser}
      />
    </>
  );
}
