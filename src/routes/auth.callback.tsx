import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { completeDiscordAuth } from "@/features/auth/functions/complete-discord-auth";
import { getDiscordRedirectUri } from "@/lib/app-url";
import {
  clearDiscordLinked,
  clearStoredOAuthState,
  readStoredOAuthCodeVerifier,
  readStoredOAuthRedirectUri,
  retryDiscordOAuthAfterConsentRequired,
  shouldRetryDiscordWithConsent,
  validateOAuthState,
} from "@/features/auth/services/discord";
import { isDiscordNativeRedirectUri } from "@/lib/discord-mobile-oauth";
import { setSession } from "@/features/auth/store/session";
import { getPostAuthPath } from "@/features/auth/utils/routes";
import brLogo from "@/assets/BR Text white.png";

type AuthCallbackSearch = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

function isDevServerFnRaceError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("Invalid server function ID");
}

async function exchangeDiscordCode(code: string, redirectUri: string) {
  const maxAttempts = import.meta.env.DEV ? 3 : 1;
  const codeVerifier = readStoredOAuthCodeVerifier();
  const needsVerifier = isDiscordNativeRedirectUri(redirectUri);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await completeDiscordAuth({
        data: {
          code,
          redirectUri,
          codeVerifier: needsVerifier ? (codeVerifier ?? undefined) : undefined,
        },
      });
    } catch (err) {
      const canRetry =
        import.meta.env.DEV && isDevServerFnRaceError(err) && attempt < maxAttempts - 1;
      if (canRetry) {
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Could not complete Discord sign-in.");
}

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>): AuthCallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  head: () => ({
    meta: [{ title: "Signing In — Black Rose" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const authStartedRef = useRef(false);

  useEffect(() => {
    if (authStartedRef.current) return;
    authStartedRef.current = true;

    let cancelled = false;

    async function finishAuth() {
      if (search.error) {
        if (shouldRetryDiscordWithConsent(search.error)) {
          clearDiscordLinked();
          retryDiscordOAuthAfterConsentRequired();
          return;
        }
        clearStoredOAuthState();
        setErrorMessage(search.error_description ?? "Discord authorization was denied.");
        return;
      }

      if (!search.code) {
        clearStoredOAuthState();
        setErrorMessage("Missing authorization code from Discord.");
        return;
      }

      if (!validateOAuthState(search.state)) {
        clearStoredOAuthState();
        setErrorMessage(
          "Invalid or expired sign-in session. Start sign-in again on the same browser you used, or choose “Continue in browser” on the login page.",
        );
        return;
      }

      try {
        const redirectUri = readStoredOAuthRedirectUri() ?? getDiscordRedirectUri();
        const { user } = await exchangeDiscordCode(search.code, redirectUri);
        if (cancelled) return;

        clearStoredOAuthState();
        setSession(user);
        // Use the stored post-auth redirect if available, fall back to role-based default.
        // Uses localStorage so it survives the new tab Discord opens after authorization.
        let destination: string = getPostAuthPath(user.role);
        try {
          const stored = localStorage.getItem("br_post_auth_redirect");
          // Accept only same-origin paths: must start with "/" but not "//" or "/\"
          // (protocol-relative URLs like //evil.com would bypass the origin check)
          if (
            stored &&
            stored.startsWith("/") &&
            !stored.startsWith("//") &&
            !stored.startsWith("/\\")
          ) {
            destination = stored;
            localStorage.removeItem("br_post_auth_redirect");
          } else if (stored) {
            // Invalid value — discard it silently
            localStorage.removeItem("br_post_auth_redirect");
          }
        } catch {
          // localStorage unavailable
        }
        navigate({ to: destination as "/dashboard" | "/waitlist", replace: true });
      } catch (err) {
        if (cancelled) return;
        clearStoredOAuthState();
        const message = err instanceof Error ? err.message : "Could not complete Discord sign-in.";
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
              className="clip-cta inline-flex h-11 items-center justify-center bg-foreground px-4 font-tech text-ui-readable uppercase text-background"
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
        <p className="font-tech text-label-readable uppercase text-muted-foreground">
          Completing Discord sign-in…
        </p>
      </div>
    </div>
  );
}
