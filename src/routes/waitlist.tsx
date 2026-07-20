import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { useVerificationSync } from "@/features/auth/hooks/useVerificationSync";
import { getSession, clearSession } from "@/features/auth/store/session";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import {
  DISCORD_SERVER_INVITE,
  DISCORD_FOR_BRIEFING_ROLE_LABEL,
  DISCORD_TOURNA_ROLES_CHANNEL_LABEL,
  DISCORD_TOURNA_ROLES_CHANNEL_URL,
  DISCORD_VERIFICATION_CHANNEL_URL,
  DISCORD_VERIFICATION_CHANNEL_LABEL,
} from "@/features/auth/constants";
import { DiscordAppAnchor } from "@/features/shared/components/DiscordAppAnchor";
import { DiscordIcon } from "@/features/shared/components/DiscordIcon";
import { StepNum } from "@/features/waitlist/components/StepNum";
import { WaitlistStepDetails } from "@/features/waitlist/components/WaitlistStepDetails";
import { WAITLIST_TEMPLATES } from "@/features/waitlist/constants";
import brLogo from "@/assets/BR Text white.png";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Awaiting Verification — Black Rose" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WaitlistPage,
});

// ── Page ──────────────────────────────────────────────────────────────────────

function WaitlistPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  const [copiedGame, setCopiedGame] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templatesToggleId = useId();
  const templatesPanelId = useId();

  const goToDashboard = useCallback(() => {
    navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  const { syncVerification, isChecking, checkError } = useVerificationSync({
    onVerified: goToDashboard,
    poll: true,
  });

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    if (hasFullMemberAccess(session.role)) {
      goToDashboard();
      return;
    }

    setUsername(session.displayName || session.username);
  }, [navigate, goToDashboard]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  function handleSignOut() {
    clearSession();
    navigate({ to: "/" });
  }

  function copyTemplate(game: string, fields: readonly string[]) {
    const text = `Application — ${game}\n\n${fields.join("\n")}`;
    void navigator.clipboard.writeText(text).then(
      () => {
        if (copyResetTimerRef.current !== null) {
          clearTimeout(copyResetTimerRef.current);
        }
        setCopiedGame(game);
        copyResetTimerRef.current = setTimeout(() => {
          setCopiedGame(null);
          copyResetTimerRef.current = null;
        }, 2000);
      },
      () => {
        if (copyResetTimerRef.current !== null) {
          clearTimeout(copyResetTimerRef.current);
          copyResetTimerRef.current = null;
        }
        setCopiedGame(null);
      },
    );
  }

  return (
    // Full-screen waitlist layout
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,255,255,0.05),transparent)]" />

      {/* Centred content — fills screen vertically when collapsed */}
      <div className="relative mx-auto flex w-full max-w-md flex-col px-6 py-8 sm:py-12">
        {/* BR Text logo */}
        <div className="mb-8 flex justify-center">
          <img
            src={brLogo}
            alt="Black Rose"
            className="h-15 w-auto object-contain"
            draggable={false}
          />
        </div>

        {/* Status badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 border border-amber-400/20 bg-amber-400/5 px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="font-tech text-label-readable uppercase text-amber-400">
              Pending Verification
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl tracking-display sm:text-5xl">You're on the List</h1>
          {username && (
            <p className="mt-2 text-sm text-muted-foreground">
              Welcome, <span className="font-medium text-foreground">{username}</span>.
            </p>
          )}
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-2.5">
          {/* Step 1 */}
          <div className="flex gap-4 border border-white/6 bg-white/2 px-4 py-4">
            <StepNum n="1" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Join Discord</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                All verification happens on our Discord server.
              </p>
              <DiscordAppAnchor
                discordUrl={DISCORD_SERVER_INVITE}
                className="mt-3 font-medium inline-flex h-11 items-center gap-2 bg-[#5865F2] px-4 font-tech text-ui-readable uppercase text-white transition hover:bg-[#4752c4]"
              >
                <DiscordIcon className="h-3.5 w-3.5 shrink-0" />
                Join Discord
              </DiscordAppAnchor>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 border border-white/6 bg-white/2 px-4 py-4">
            <StepNum n="2" />
            <div className="min-w-0 w-full">
              <p className="text-sm font-medium">
                Post in{" "}
                <DiscordAppAnchor
                  discordUrl={DISCORD_VERIFICATION_CHANNEL_URL}
                  className="cursor-pointer text-foreground underline-offset-2 hover:underline"
                >
                  #{DISCORD_VERIFICATION_CHANNEL_LABEL}
                </DiscordAppAnchor>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Copy a format, fill it out, and post your application.
              </p>
              <button
                id={templatesToggleId}
                type="button"
                onClick={() => setShowTemplates((v) => !v)}
                aria-expanded={showTemplates}
                aria-controls={templatesPanelId}
                className="mt-3 inline-flex h-11 items-center gap-2 border border-white/10 px-4 font-tech text-label-readable uppercase text-muted-foreground transition hover:border-white/25 hover:text-foreground"
              >
                {showTemplates ? "Hide" : "View"} Formats
              </button>
              <WaitlistStepDetails>
                <p>
                  Staff review applications in this channel. Everyone starts with the Guest role.
                  Please wait while your application is being reviewed for additional roles.
                </p>
              </WaitlistStepDetails>

              {showTemplates && (
                <div
                  id={templatesPanelId}
                  role="region"
                  aria-labelledby={templatesToggleId}
                  className="mt-4 flex flex-col gap-2"
                >
                  {WAITLIST_TEMPLATES.map((t) => (
                    <div key={t.game} className="border border-white/8 bg-background">
                      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2">
                        <span className={`text-xs font-medium ${t.accent}`}>{t.game}</span>
                        <button
                          type="button"
                          onClick={() => copyTemplate(t.game, t.fields)}
                          className="cursor-pointer inline-flex items-center gap-1.5 font-tech text-label-readable uppercase text-muted-foreground transition hover:text-foreground"
                        >
                          {copiedGame === t.game ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <ul className="flex flex-col gap-0.5 px-3 py-2.5">
                        {t.fields.map((f) => (
                          <li key={f} className="text-[11px] text-muted-foreground">
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 3 */}
          {/* <div className="flex gap-4 border border-white/6 bg-white/2 px-4 py-4">
            <StepNum n="3" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Get ROSE on Discord</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                When approved (with the {DISCORD_FOR_BRIEFING_ROLE_LABEL} role), react with ROSE in
                #{DISCORD_TOURNA_ROLES_CHANNEL_LABEL}.
              </p>
              <DiscordAppAnchor
                discordUrl={DISCORD_TOURNA_ROLES_CHANNEL_URL}
                className="mt-3 font-medium inline-flex h-11 items-center gap-2 border border-white/10 px-4 font-tech text-label-readable uppercase text-muted-foreground transition hover:border-white/25 hover:text-foreground"
              >
                Open #{DISCORD_TOURNA_ROLES_CHANNEL_LABEL}
              </DiscordAppAnchor>
              <WaitlistStepDetails>
                <p>
                  Approved members receive{" "}
                  <span className="font-medium text-foreground">
                    {DISCORD_FOR_BRIEFING_ROLE_LABEL}
                  </span>
                  , which unlocks #{DISCORD_TOURNA_ROLES_CHANNEL_LABEL}. React with ROSE there — it
                  is required for full website access.
                </p>
              </WaitlistStepDetails>
            </div>
          </div> */}

          {/* Step 4 */}
          <div className="flex gap-4 border border-white/6 bg-white/2 px-4 py-4">
            <StepNum n="3" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Verify here</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                We sync your ROSE role from Discord to unlock the site.
              </p>
              <button
                type="button"
                onClick={() => void syncVerification()}
                disabled={isChecking}
                className="mt-3 inline-flex h-11 items-center gap-2 border border-white/10 px-4 font-tech text-label-readable uppercase text-muted-foreground transition hover:border-white/25 hover:text-foreground disabled:opacity-50"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking…
                  </>
                ) : (
                  "Check status"
                )}
              </button>
              {checkError && <p className="mt-2 text-xs text-destructive">{checkError}</p>}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between border-t border-white/6 pt-5">
          <Link
            to="/"
            className="cursor-pointer text-xs font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
          >
            Browse Tournaments
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="cursor-pointer text-xs font-tech uppercase tracking-wider-2 text-muted-foreground/80 transition hover:text-foreground"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
