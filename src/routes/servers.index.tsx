import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { Emblem } from "@/features/shared/components/Emblem";
import { Skeleton } from "@/components/ui/skeleton";
import { usePalworldServers } from "@/features/game-servers/hooks/usePalworldServers";
import type { PalworldServerStatus } from "@/features/game-servers/types";

export const Route = createFileRoute("/servers/")({
  head: () => ({
    meta: [
      { title: "Game Servers — Black Rose" },
      {
        name: "description",
        content:
          "Live status overview of Black Rose Palworld community game servers. Check player counts, uptime, and world progress.",
      },
    ],
  }),
  component: ServersPage,
});

// ---------------------------------------------------------------------------
// Palworld icon — uses the real asset from /public
// ---------------------------------------------------------------------------
function PalworldIcon({ className }: { className?: string }) {
  return (
    <img
      src="/64x64 Palworld Icon.png"
      alt="Palworld"
      width={64}
      height={64}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// Uptime formatter
// ---------------------------------------------------------------------------
function formatUptime(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// Server Rules
// ---------------------------------------------------------------------------

const SERVER_RULES = {
  welcome:
    "Welcome to the Black Rose Palworld Servers! We're excited to have you here. These servers are exclusive to verified Black Rose members, and our goal is to build a fun, active, and community-driven experience for everyone.",
  sections: [
    {
      title: "Server Guidelines",
      rules: [
        "Change your Discord nickname to match your Palworld IGN for easier verification.",
        "Black Rose members only. We regularly verify players and remove those who are not part of the community to keep the servers healthy and enjoyable.",
        "Bringing friends? They're more than welcome — just have them complete the same verification process through our Discord. You can find the invite on www.blackrose.asia.",
        "No cheating, exploiting, or using any unfair advantages. We want everyone to enjoy the game the way it's meant to be played. Violations may result in removal.",
        "We highly discourage solo play. Palworld is much more fun together! Join or create a guild, make new friends, and work together. This ensures no one monopolises the best locations.",
        "Guilds help ensure resources, prime base locations, and progression are shared among members — creating a healthier server for everyone.",
      ],
    },
    {
      title: "Be Part of Black Rose",
      rules: [
        "If you're in our Discord, you're already part of Black Rose. Hang out, chat, join voice channels, play with others, and don't be a stranger.",
        "We encourage everyone to stay active on Discord — that's where friendships, parties, events, and opportunities happen.",
        "If you want to take on a bigger role in the community, it all starts with being present, engaging with others, and contributing positively.",
      ],
    },
  ],
  closing: "Let's build something awesome together. Welcome to Black Rose. Rise As One.",
};

function ServerRulesPanel() {
  const [open, setOpen] = useState(true); // defaults open — rules shouldn't be hidden

  return (
    <div className="border border-amber-400/25 bg-[oklch(0.06_0_0)] shadow-[0_0_0_1px_rgba(251,191,36,0.03)_inset]">
      {/* Accordion trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full flex-wrap items-center justify-between gap-2 px-4 py-4 transition-colors hover:bg-white/5 sm:gap-4 sm:px-6"
        aria-expanded={open}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <span className="h-px w-4 shrink-0 bg-amber-300/60 sm:w-6" />
          <p className="font-tech text-[10px] uppercase tracking-wider text-white group-hover:text-white transition-colors">
            Community Standards
          </p>
          <span className="border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-tech text-[8px] uppercase tracking-wider text-amber-300">
            All Servers
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden font-tech text-[10px] uppercase tracking-wider text-white/70 sm:inline">
            {open ? "Hide Rules" : "Read Server Rules"}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-white/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="relative border-t border-amber-400/15 px-4 py-6 sm:px-6 sm:py-8">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.12]" />

          <div className="relative">
            <p className="mb-8 border-l-2 border-amber-300/50 pl-4 text-sm leading-7 text-white/90">
              {SERVER_RULES.welcome}
            </p>

            <div className="grid gap-8 sm:grid-cols-2">
              {SERVER_RULES.sections.map((section, si) => (
                <div key={si}>
                  <div className="mb-4 font-tech text-[10px] uppercase tracking-wider text-amber-200/80">
                    {section.title}
                  </div>
                  <ol className="space-y-3">
                    {section.rules.map((rule, ri) => (
                      <li key={ri} className="flex gap-3">
                        <span className="mt-0.5 shrink-0 font-tech text-[10px] uppercase tracking-wider text-white/40">
                          {String(ri + 1).padStart(2, "0")}
                        </span>
                        <p className="text-sm leading-6 text-white/90">{rule}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-amber-400/15 pt-6 text-center">
              <p className="font-display text-lg tracking-display text-white">
                {SERVER_RULES.closing}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Server detail card
// ---------------------------------------------------------------------------
function ServerCard({ server }: { server: PalworldServerStatus }) {
  const playerPct =
    server.maxPlayers > 0
      ? Math.min(100, Math.round((server.currentPlayers / server.maxPlayers) * 100))
      : 0;

  return (
    <article className="clip-angle-lg group relative flex flex-col border border-white/[0.07] bg-[oklch(0.055_0_0)] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
      {/* Cyberpunk corner brackets */}
      <span className="pointer-events-none absolute left-0 top-0 z-10 h-5 w-5 border-l border-t border-white/20" />
      <span className="pointer-events-none absolute right-0 top-0 z-10 h-5 w-5 border-r border-t border-white/20" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-10 h-5 w-5 border-b border-l border-white/15" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-5 w-5 border-b border-r border-white/15" />

      {/* ── Palworld banner image ─────────────────────────── */}
      <div className="relative h-32 overflow-hidden">
        <img
          src="/palworld.png"
          alt="Palworld"
          className={`h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.04] ${
            server.online
              ? "brightness-75 saturate-75 group-hover:brightness-90 group-hover:saturate-100"
              : "brightness-[0.35] saturate-0"
          }`}
        />
        {/* Gradient fade to card body */}
        <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.055_0_0)] via-[oklch(0.055_0_0/0.4)] to-transparent" />
        {/* Scan-line texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)",
          }}
        />
        {/* Neon baseline — green if online */}
        <div
          className={`absolute inset-x-0 bottom-0 h-px transition duration-500 ${
            server.online
              ? "bg-linear-to-r from-transparent via-emerald-400/70 to-transparent opacity-80 group-hover:opacity-100"
              : "bg-linear-to-r from-transparent via-white/10 to-transparent"
          }`}
        />

        {/* Status badge — overlaid on image */}
        <div
          className={`absolute left-3 top-3 flex items-center gap-1.5 border px-2 py-0.5 font-tech text-label-readable uppercase backdrop-blur-md ${
            server.online
              ? "border-emerald-400/25 bg-black/70 text-emerald-300"
              : "border-white/8 bg-black/70 text-white/30"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {server.online && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                server.online ? "bg-emerald-400" : "bg-white/20"
              }`}
            />
          </span>
          {server.online ? "Online" : "Offline"}
        </div>

        {/* Palworld icon — overlaid bottom-right */}
        <div className="absolute bottom-3 right-3">
          <PalworldIcon
            className={`h-7 w-7 object-contain transition duration-300 ${
              server.online ? "opacity-80 group-hover:opacity-100" : "opacity-25"
            }`}
          />
        </div>
      </div>

      {/* ── Card body ────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col gap-5 p-5">
        {/* Subtle grid bg */}
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.15]" />

        {/* Server name */}
        <div className="relative">
          <p className="font-tech text-label-readable uppercase tracking-[0.08em] text-muted-foreground">
            Palworld · {server.id.replace("server-", "Server ")}
          </p>
          <h3 className="mt-1 font-display text-2xl tracking-display text-white leading-tight">
            {server.name}
          </h3>
          {server.version && (
            <p className="mt-1 font-tech text-[10px] uppercase tracking-wider text-white/20">
              v{server.version}
            </p>
          )}
        </div>

        {/* Stats strip */}
        <dl className="relative sticky bottom-0 z-20 grid grid-cols-3 divide-x divide-white/[0.08] border-y border-white/[0.08] py-3 bg-[oklch(0.055_0_0)]">
          <div className="pr-3 min-w-0">
            <dt className="font-tech text-label-readable uppercase text-muted-foreground truncate">
              Players
            </dt>
            <dd className="mt-1 font-display text-xl tracking-[0.06em] text-white whitespace-nowrap">
              {server.online ? `${server.currentPlayers}/${server.maxPlayers}` : "—"}
            </dd>
          </div>
          <div className="px-3 min-w-0">
            <dt className="font-tech text-label-readable uppercase text-muted-foreground truncate">
              Uptime
            </dt>
            <dd className="mt-1 font-display text-xl tracking-[0.06em] text-white whitespace-nowrap">
              {server.online ? formatUptime(server.uptime) : "—"}
            </dd>
          </div>
          <div className="pl-3 min-w-0">
            <dt className="font-tech text-label-readable uppercase text-muted-foreground truncate">
              World Day
            </dt>
            <dd className="mt-1 font-display text-xl tracking-[0.06em] text-white whitespace-nowrap">
              {server.online ? `Day ${server.days}` : "—"}
            </dd>
          </div>
        </dl>

        {/* Player capacity bar */}
        {server.online && server.maxPlayers > 0 && (
          <div className="relative">
            <div className="mb-1.5 flex items-center justify-between font-tech text-label-readable uppercase text-muted-foreground">
              <span>Capacity</span>
              <span className={playerPct >= 100 ? "text-white" : "text-white/50"}>
                {playerPct >= 100 ? "Full" : `${playerPct}%`}
              </span>
            </div>
            <div className="h-px w-full bg-white/10">
              <div
                className={`h-px transition-all duration-700 ${
                  playerPct >= 100
                    ? "bg-white"
                    : playerPct >= 70
                      ? "bg-amber-300/90"
                      : "bg-emerald-400/80"
                }`}
                style={{ width: `${playerPct}%` }}
              />
            </div>
          </div>
        )}

        {/* View details CTA */}
        <Link
          to="/servers/$id"
          params={{ id: server.id }}
          className="relative mt-auto clip-cta inline-flex h-10 w-full items-center justify-center gap-2 border border-white/15 bg-white/4 font-tech text-[10px] uppercase tracking-wider text-white/60 transition hover:border-white/25 hover:bg-white/8 hover:text-white"
        >
          View Server
          <span aria-hidden>→</span>
        </Link>
      </div>
      {/* end card body */}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------
function ServerCardSkeleton() {
  return (
    <div className="clip-angle-lg flex flex-col border border-white/[0.08] bg-card">
      <Skeleton className="h-32 rounded-none bg-white/5" />
      <div className="flex flex-col gap-4 p-5">
        <Skeleton className="h-3 w-20 rounded-none bg-white/5" />
        <Skeleton className="h-7 w-40 rounded-none bg-white/5" />
        <Skeleton className="h-16 w-full rounded-none bg-white/5" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function ServersPage() {
  const { servers, isLoading, lastUpdated, refetch } = usePalworldServers();

  const onlineCount = servers.filter((s) => s.online).length;
  const totalPlayers = servers.reduce((sum, s) => sum + (s.online ? s.currentPlayers : 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* ── Page hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/6 site-header-offset-hero pb-20">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
        <Emblem
          spin
          className="pointer-events-none absolute -right-20 top-0 h-128 w-lg opacity-[0.04]"
        />

        {/* Palworld banner watermark — right side of hero */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.10]"
          style={{
            backgroundImage: "url(/palworld-banner.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "linear-gradient(to right, transparent, black)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-4 inline-flex items-center gap-3 font-tech text-label-readable uppercase text-muted-foreground">
            <span className="h-px w-10 bg-border" />
            Community Gaming
          </div>

          <div className="flex items-end gap-4">
            <h1 className="font-display text-5xl tracking-display sm:text-6xl md:text-7xl">
              Game Servers
            </h1>
            {/* Live refresh indicator */}
            <div className="mb-2 hidden items-center gap-2 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500/40 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500/60" />
              </span>
              <span className="font-tech text-[10px] uppercase tracking-wider text-white/30">
                Live
              </span>
            </div>
          </div>

          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
            Black Rose Palworld community servers — live player counts, uptime, and world progress.
            Data refreshes every 60 seconds.
          </p>

          {/* Stats strip — full-width on mobile, auto-width on sm+ */}
          <div className="mt-10 sticky bottom-0 z-20 grid w-full grid-cols-3 divide-x divide-white/8 border border-white/8 bg-white/2.5 sm:inline-grid sm:w-auto">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-4 py-4 sm:px-6 sm:py-5">
                    <Skeleton className="h-9 w-10 mb-2" />
                    <Skeleton className="h-3 w-16 sm:w-24" />
                  </div>
                ))
              : [
                  { label: "Total Servers", value: servers.length },
                  { label: "Online Now", value: onlineCount },
                  { label: "Platform", value: "PC · PS5 · Xbox" },
                ].map((s) => (
                  <div key={s.label} className="px-4 py-4 sm:px-6 sm:py-5">
                    <div className="font-display text-2xl tracking-display sm:text-3xl md:text-4xl">
                      {s.value}
                    </div>
                    <div className="mt-1 font-tech text-label-readable uppercase text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ── Server grid ────────────────────────────────────── */}
      <main className="relative bg-[oklch(0.05_0_0)]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

        <div className="relative mx-auto max-w-7xl px-6 py-14">
          {/* Community Standards — now sits directly above the server cards */}
          <div className="mb-8">
            <ServerRulesPanel />
          </div>

          {/* Toolbar: last updated + refresh */}
          <div className="mb-8 flex items-center justify-between">
            <p className="font-tech text-label-readable uppercase text-muted-foreground">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Fetching status…"}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="clip-cta inline-flex h-9 items-center gap-2 border border-white/15 bg-white/4 px-4 font-tech text-[10px] uppercase tracking-wider text-white/60 transition hover:border-white/25 hover:bg-white/8 hover:text-white disabled:pointer-events-none disabled:opacity-40"
            >
              {isLoading ? "Refreshing…" : "Refresh"}
              <span aria-hidden>↺</span>
            </button>
          </div>

          {/* Grid */}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <ServerCardSkeleton key={i} />)
              : servers.map((server) => <ServerCard key={server.id} server={server} />)}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
