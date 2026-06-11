import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { completeRiotAuth } from "@/features/riot/functions/complete-riot-auth";
import { getRiotRedirectUri } from "@/lib/riot-url";
import {
  clearStoredRiotOAuthState,
  readStoredRiotLinkContext,
  readStoredRiotOAuthRedirectUri,
  validateRiotOAuthState,
} from "@/features/riot/services/riot-rso";
import brLogo from "@/assets/BR Text white.png";

type RiotCallbackSearch = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

export const Route = createFileRoute("/auth/riot/callback")({
  validateSearch: (search: Record<string, unknown>): RiotCallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Linking Riot Account — Black Rose" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RiotCallbackPage,
});

function RiotCallbackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishLink() {
      if (search.error) {
        clearStoredRiotOAuthState();
        setErrorMessage(search.error_description ?? "Riot authorization was denied.");
        return;
      }

      if (!search.code) {
        clearStoredRiotOAuthState();
        setErrorMessage("Missing authorization code from Riot.");
        return;
      }

      if (!validateRiotOAuthState(search.state)) {
        clearStoredRiotOAuthState();
        setErrorMessage("Invalid or expired linking session. Please try again.");
        return;
      }

      const linkContext = readStoredRiotLinkContext();
      if (!linkContext) {
        clearStoredRiotOAuthState();
        setErrorMessage("Missing link session. Start again from your dashboard.");
        return;
      }

      try {
        const redirectUri = readStoredRiotOAuthRedirectUri() ?? getRiotRedirectUri();
        await completeRiotAuth({
          data: {
            code: search.code,
            redirectUri,
            memberId: linkContext.memberId,
            isPublic: linkContext.isPublic,
            region: linkContext.region,
          },
        });
        if (cancelled) return;

        clearStoredRiotOAuthState();
        navigate({
          to: "/dashboard/profile",
          search: { tab: "player", riot: "linked" },
          replace: true,
        });
      } catch (err) {
        if (cancelled) return;
        clearStoredRiotOAuthState();
        const message =
          err instanceof Error ? err.message : "Could not complete Riot account linking.";
        setErrorMessage(message);
      }
    }

    void finishLink();

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
          <h1 className="font-display text-2xl tracking-display">Linking failed</h1>
          <p className="mt-3 text-sm text-muted-foreground">{errorMessage}</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/dashboard/profile"
              search={{ tab: "player" }}
              className="clip-cta inline-flex h-10 items-center justify-center bg-foreground px-4 font-tech text-[10px] uppercase tracking-wider-2 text-background"
            >
              Back to profile
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
          Completing Riot account link…
        </p>
      </div>
    </div>
  );
}
