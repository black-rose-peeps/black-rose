import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { getSession, clearSession } from "@/features/auth/store/session";
import { DISCORD_SERVER_INVITE } from "@/features/auth/constants";
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

// ── Application templates ─────────────────────────────────────────────────────

const TEMPLATES = [
  {
    game: "Valorant",
    accent: "text-red-400",
    fields: [
      "IGN&#:",
      "Rank:",
      "Nationality:",
      "Invited by / Referred by:",
      "Streaming Page: (optional)",
    ],
  },
  // {
  //   game: "Mobile Legends (MLBB)",
  //   accent: "text-sky-400",
  //   fields: [
  //     "IGN:",
  //     "UID:",
  //     "Rank:",
  //     "Nationality:",
  //     "Invited by / Referred by:",
  //     "Streaming Page: (optional)",
  //   ],
  // },
  // {
  //   game: "CS2",
  //   accent: "text-amber-400",
  //   fields: [
  //     "IGN:",
  //     "Steam ID:",
  //     "Rank:",
  //     "Nationality:",
  //     "Invited by / Referred by:",
  //     "Streaming Page: (optional)",
  //   ],
  // },
  {
    game: "Other Games",
    accent: "text-muted-foreground",
    fields: [
      "Game:",
      "IGN:",
      "UID (if applicable):",
      "Rank:",
      "Nationality:",
      "Invited by / Referred by:",
      "Streaming Page: (optional)",
    ],
  },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

function WaitlistPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  const [copiedGame, setCopiedGame] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate({ to: "/register" });
      return;
    }
    if (session.role === "verified" || session.role === "admin") {
      navigate({ to: "/" });
      return;
    }
    setUsername(session.displayName || session.username);
  }, [navigate]);

  function handleSignOut() {
    clearSession();
    navigate({ to: "/" });
  }

  function copyTemplate(game: string, fields: readonly string[]) {
    const text = `Application — ${game}\n\n${fields.join("\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedGame(game);
      setTimeout(() => setCopiedGame(null), 2000);
    });
  }

  return (
    // Full-screen, no scroll when templates are collapsed
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,255,255,0.05),transparent)]" />

      {/* Centred content — fills screen vertically when collapsed */}
      <div
        className={`relative mx-auto flex w-full max-w-md flex-col px-6 ${showTemplates ? "py-16" : "my-auto py-8"}`}
      >
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
            <span className="text-[10px] font-tech uppercase tracking-wider-2 text-amber-400">
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
              <p className="text-sm font-medium">Join our Discord</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                All operations happen here. You'll need to be in the server.
              </p>
              <a
                href={DISCORD_SERVER_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-8 items-center gap-2 bg-[#5865F2] px-4 font-tech text-[10px] uppercase tracking-wider-2 text-white transition hover:bg-[#4752c4]"
              >
                <DiscordIcon className="h-3.5 w-3.5 shrink-0" />
                Join Discord
              </a>
            </div>
          </div>

          {/* Step 2 — with inline collapsible templates */}
          <div className="flex gap-4 border border-white/6 bg-white/2 px-4 py-4">
            <StepNum n="2" />
            <div className="min-w-0 w-full">
              <p className="text-sm font-medium">Post your application</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                In the <span className="text-foreground">#application</span> channel, copy the
                format for your game, fill it out, and post it.
              </p>
              <button
                type="button"
                onClick={() => setShowTemplates((v) => !v)}
                className="mt-3 inline-flex h-8 items-center gap-2 border border-white/10 px-4 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
              >
                {showTemplates ? "Hide" : "View"} Application Formats
              </button>

              {/* Templates — inline under step 2 */}
              {showTemplates && (
                <div className="mt-4 flex flex-col gap-2">
                  {TEMPLATES.map((t) => (
                    <div key={t.game} className="border border-white/8 bg-background">
                      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2">
                        <span className={`text-xs font-medium ${t.accent}`}>{t.game}</span>
                        <button
                          type="button"
                          onClick={() => copyTemplate(t.game, t.fields)}
                          className="cursor-pointer inline-flex items-center gap-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
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
          <div className="flex gap-4 border border-white/6 bg-white/2 px-4 py-4">
            <StepNum n="3" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Wait for briefing</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                An officer will reach out on Discord, brief you, and verify your account.
              </p>
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

// ── Internal helpers ──────────────────────────────────────────────────────────

function StepNum({ n }: { n: string }) {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-white/15 font-display text-sm tracking-display text-muted-foreground">
      {n}
    </span>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Discord"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}
