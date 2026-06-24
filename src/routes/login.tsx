import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminConsoleLogin } from "@/features/admin/auth/AdminConsoleLogin";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { DiscordButton } from "@/features/auth/components/DiscordButton";
import { useRedirectIfAuthenticated } from "@/features/auth/hooks/useRedirectIfAuthenticated";
import {
  continueDiscordOAuthInBrowser,
  describeDiscordRedirectUri,
  isDiscordOAuthConfigured,
  isDiscordRedirectUnreachableOnDevice,
  isDiscordRejectedLanRedirectUri,
  isDiscordTunnelEnvMismatch,
  prepareDiscordOAuth,
  shouldSkipDiscordAppPrompt,
  startDiscordOAuth,
} from "@/features/auth/services/discord";
import { DiscordAppLinkDialog } from "@/features/shared/components/DiscordAppLinkDialog";
import { useDiscordAppLink } from "@/features/shared/hooks/useDiscordAppLink";
import { isCapacitorNative } from "@/lib/capacitor";
import { isDiscordPhoneOrTablet } from "@/lib/device";
import { openDiscordAppFromUserGesture } from "@/lib/discord-url";

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
        content:
          "Continue with Discord to join Black Rose — new accounts are created automatically.",
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
  const [lanRedirectWarning, setLanRedirectWarning] = useState<string | null>(null);
  const isMobileLogin = isDiscordPhoneOrTablet();
  const isNativeApp = isCapacitorNative();
  const {
    pending: discordLinkPending,
    requestDiscordAppLink,
    confirmDiscordAppLink,
    cancelDiscordAppLink,
  } = useDiscordAppLink();

  useRedirectIfAuthenticated(!isAdminConsole);

  useEffect(() => {
    if (isDiscordRejectedLanRedirectUri()) {
      setLanRedirectWarning(
        `Using ${describeDiscordRedirectUri()} as the OAuth callback. If sign-in fails after authorize, ` +
          "use an HTTPS tunnel — see .env.example.",
      );
    }
  }, []);

  function handleDiscordAuth() {
    setError(null);
    if (!isDiscordOAuthConfigured()) {
      setError(
        "Discord sign-in is not configured. Set VITE_DISCORD_CLIENT_ID in your environment.",
      );
      return;
    }
    if (isDiscordRedirectUnreachableOnDevice()) {
      const configured = import.meta.env.VITE_DISCORD_REDIRECT_URI?.trim();
      setError(
        `Discord would redirect to ${configured ?? "http://localhost:…"} after authorize, but ` +
          `"localhost" on your phone is the phone itself — not your PC. Remove ` +
          "VITE_DISCORD_REDIRECT_URI from .env.local when testing on mobile, open the site at " +
          "http://YOUR-PC-LAN-IP:3000 on your phone, and register that exact callback URL in " +
          "Discord → OAuth2 → Redirects. For reliable mobile dev, use an HTTPS tunnel instead " +
          "(see .env.example).",
      );
      return;
    }
    if (isDiscordTunnelEnvMismatch()) {
      const tunnelOrigin =
        import.meta.env.VITE_DISCORD_REDIRECT_URI?.replace(/\/auth\/callback\/?$/, "") ??
        "your HTTPS tunnel URL";
      setError(
        `Open ${tunnelOrigin} on this device (not a LAN IP). ` +
          "VITE_DISCORD_REDIRECT_URI is for mobile dev tunnels — remove it when testing on " +
          "http://YOUR-LAN-IP or use the tunnel URL in your browser. Production: use " +
          "https://blackrose.asia or https://dev.blackrose.asia.",
      );
      return;
    }
    try {
      if (isNativeApp) {
        void startDiscordOAuth();
        return;
      }

      if (isMobileLogin) {
        startDiscordOAuth();
        return;
      }

      const { browserFallbackUrl } = prepareDiscordOAuth();
      if (shouldSkipDiscordAppPrompt()) {
        openDiscordAppFromUserGesture(browserFallbackUrl);
        return;
      }
      requestDiscordAppLink(browserFallbackUrl, "Discord sign-in", "oauth");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start Discord sign-in.";
      setError(message);
    }
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
          {isNativeApp ? (
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Opens the Discord app to sign in with your account, then returns to Black Rose.
            </p>
          ) : isMobileLogin ? (
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              On mobile web, Discord sign-in opens in your browser. Make sure you&apos;re logged
              into the Discord account you want to use there.
            </p>
          ) : null}
          {lanRedirectWarning && (
            <p className="text-center text-xs leading-relaxed text-amber-200/80">
              {lanRedirectWarning}
            </p>
          )}
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

      {!isMobileLogin && !isNativeApp && (
        <DiscordAppLinkDialog
          pending={discordLinkPending}
          onConfirm={confirmDiscordAppLink}
          onCancel={cancelDiscordAppLink}
          onBrowserFallback={continueDiscordOAuthInBrowser}
        />
      )}
    </>
  );
}
