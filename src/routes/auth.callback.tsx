import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { completeDiscordAuth } from "@/features/auth/functions/complete-discord-auth";
import { getDiscordRedirectUri } from "@/lib/app-url";
import { DISCORD_OAUTH_STATE_KEY } from "@/features/auth/constants";
import {
  clearDiscordLinked,
  getDiscordOAuthUrl,
  markDiscordLinked,
  readStoredOAuthRedirectUri,
  shouldRetryDiscordWithConsent,
  validateOAuthState,
} from "@/features/auth/services/discord";
import { setSession } from "@/features/auth/store/session";
import { getPostAuthPath } from "@/features/auth/utils/routes";
import brLogo from "@/assets/BR Text white.png";

type AuthCallbackSearch = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>): AuthCallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Signing In — Black Rose" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      if (search.error) {
        if (shouldRetryDiscordWithConsent(search.error)) {
          clearDiscordLinked();
          const state = crypto.randomUUID();
          sessionStorage.setItem(DISCORD_OAUTH_STATE_KEY, state);
          window.location.href = getDiscordOAuthUrl(state);
          return;
        }
        setErrorMessage(search.error_description ?? "Discord authorization was denied.");
        return;
      }

      if (!search.code) {
        setErrorMessage("Missing authorization code from Discord.");
        return;
      }

      if (!validateOAuthState(search.state)) {
        setErrorMessage("Invalid or expired sign-in session. Please try again.");
        return;
      }

      try {
        const redirectUri = readStoredOAuthRedirectUri() ?? getDiscordRedirectUri();
        const { user } = await completeDiscordAuth({
          data: { code: search.code, redirectUri },
        });
        if (cancelled) return;

        setSession(user);
        markDiscordLinked();
        navigate({ to: getPostAuthPath(user.role), replace: true });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not complete Discord sign-in.";
        setErrorMessage(message);
      }
    }

    void finishAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, search.code, search.error, search.error_description, search.state]);

  if (errorMessage) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        <div className="relative w-full max-w-md border border-white/10 bg-[oklch(0.07_0_0)] p-8 text-center">
          <img src={brLogo} alt="Black Rose" className="mx-auto mb-6 h-12 w-auto object-contain" />
          <h1 className="font-display text-2xl tracking-display">Sign-in failed</h1>
          <p className="mt-3 text-sm text-muted-foreground">{errorMessage}</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/login"
              className="clip-cta inline-flex h-10 items-center justify-center bg-foreground px-4 font-tech text-[10px] uppercase tracking-wider-2 text-background"
            >
              Try again with Discord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="relative text-center">
        <img src={brLogo} alt="Black Rose" className="mx-auto mb-6 h-12 w-auto object-contain" />
        <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
          Completing Discord sign-in…
        </p>
      </div>
    </div>
  );
}
