import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { CommunityPortrait } from "@/features/community/components/CommunityPortrait";
import { GuildCodeGrid } from "@/features/community/components/GuildCodeGrid";
import { GUILD_MASTER_ATTRIBUTION } from "@/features/community/constants/guild-code";
import { DISCORD_SERVER_INVITE } from "@/features/auth/constants";
import { DiscordAppAnchor } from "@/features/shared/components/DiscordAppAnchor";
import { Emblem } from "@/features/shared/components/Emblem";
import palworldBanner from "/palworld-banner.png";
import wwmBanner from "@/assets/wwm-tournament-header.jpg";

export const Route = createFileRoute("/community/")({
  head: () => ({
    meta: [
      { title: "Community — Black Rose" },
      {
        name: "description",
        content:
          "Meet the Black Rose guild. Our Guild Code of Values defines who we are — integrity, passion, and a community built to last.",
      },
    ],
  }),
  component: CommunityPage,
});

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type CommunityTab = "overview" | "servers" | "guilds";

// ---------------------------------------------------------------------------
// Game card — editorial card linking to a game section
// ---------------------------------------------------------------------------

interface GameCardProps {
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  bannerSrc: string;
  bannerAlt: string;
  ctaLabel: string;
  ctaHref: "/servers" | "/guilds";
  accentLine: string;
  accentTag: string;
}

function GameCard({
  title,
  subtitle,
  description,
  tag,
  bannerSrc,
  bannerAlt,
  ctaLabel,
  ctaHref,
  accentLine,
  accentTag,
}: GameCardProps) {
  return (
    <article className="clip-angle-lg group relative flex flex-col overflow-hidden border border-white/[0.07] bg-[oklch(0.055_0_0)] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] transition duration-500 hover:shadow-[0_24px_64px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset]">
      {/* Cyberpunk corner brackets */}
      <span className="pointer-events-none absolute left-0 top-0 z-10 h-5 w-5 border-l border-t border-white/20" />
      <span className="pointer-events-none absolute right-0 top-0 z-10 h-5 w-5 border-r border-t border-white/20" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-10 h-5 w-5 border-b border-l border-white/15" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-5 w-5 border-b border-r border-white/15" />

      {/* Banner image */}
      <Link
        to={ctaHref}
        className="relative block h-48 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:h-56"
      >
        <img
          src={bannerSrc}
          alt={bannerAlt}
          className="h-full w-full object-cover object-center brightness-[0.7] saturate-[0.7] transition duration-700 group-hover:scale-[1.03] group-hover:brightness-90 group-hover:saturate-90"
        />
        {/* Gradient fade */}
        <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.055_0_0)] via-[oklch(0.055_0_0/0.35)] to-transparent" />
        {/* Scan-line */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)",
          }}
        />
        {/* Neon baseline */}
        <div
          className={`absolute inset-x-0 bottom-0 h-px bg-linear-to-r opacity-80 transition duration-500 group-hover:opacity-100 ${accentLine}`}
        />
        {/* Top neon line */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

        {/* Game tag */}
        <div
          className={`absolute right-3 top-3 border px-2 py-0.5 font-tech text-label-readable uppercase backdrop-blur-md ${accentTag}`}
        >
          {tag}
        </div>
      </Link>

      {/* Card body */}
      <div className="relative flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.15]" />

        <div className="relative">
          <p className="font-tech text-label-readable uppercase tracking-[0.08em] text-muted-foreground">
            {subtitle}
          </p>
          <Link
            to={ctaHref}
            className="mt-1 block font-display text-3xl tracking-display text-white leading-tight transition duration-300 hover:text-white"
          >
            {title}
          </Link>
        </div>

        <div className="relative mt-4 flex-1 border-t border-white/[0.07] pt-4">
          <p className="text-sm leading-6 text-white/50">{description}</p>
        </div>

        <Link
          to={ctaHref}
          className={`relative mt-5 clip-cta inline-flex h-11 w-full items-center justify-center gap-2 font-tech text-ui-readable uppercase transition duration-300 ${accentLine.includes("transparent") ? "bg-white text-black hover:bg-white/92 border border-transparent" : "border border-white/25 bg-white/6 text-white backdrop-blur-sm hover:bg-white/10"}`}
        >
          {ctaLabel}
          <span aria-hidden className="text-sm leading-none">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Tab sections
// ---------------------------------------------------------------------------

function OverviewTab() {
  return (
    <>
      <CommunityPortrait />

      {/* ── Guild Code ────────────────────────────────────── */}
      <main className="relative bg-[oklch(0.05_0_0)]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 md:py-20">
          <div className="mb-12 max-w-2xl">
            <p className="font-tech text-label-readable uppercase text-muted-foreground">
              Magna Carta
            </p>
            <h2 className="mt-3 font-display text-4xl tracking-[0.04em] text-white md:text-5xl">
              Guild Code of Values
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
              The principles that guide every decision, every match, and every interaction in the
              Black Rose Discord and beyond.
            </p>
          </div>

          <GuildCodeGrid />

          <div className="relative mt-12 overflow-hidden border border-white/8 bg-[oklch(0.055_0_0)] px-6 py-8 clip-tab md:px-10">
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.12]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
            <p className="relative font-tech text-label-readable uppercase text-muted-foreground">
              Signed
            </p>
            <p className="relative mt-2 font-display text-2xl tracking-[0.06em] text-white">
              {GUILD_MASTER_ATTRIBUTION.name}
            </p>
            <p className="relative mt-1 text-sm text-muted-foreground">
              {GUILD_MASTER_ATTRIBUTION.title}
            </p>
          </div>
        </div>
      </main>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-white/6 bg-[oklch(0.07_0_0)] py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(255,255,255,0.05),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <Emblem
          spin
          className="pointer-events-none absolute -right-32 -top-32 h-112 w-md opacity-[0.07]"
        />
        <Emblem
          spin
          className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-[24rem] opacity-[0.05]"
        />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl tracking-display md:text-4xl">
            Ready to stand with the guild?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
            Join the Discord, meet the roster, and compete under the Black Rose banner.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <DiscordAppAnchor
              discordUrl={DISCORD_SERVER_INVITE}
              className="clip-cta font-semibold inline-flex h-12 items-center gap-2 bg-foreground px-8 font-tech text-sm uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
            >
              Join Discord
              <span aria-hidden>→</span>
            </DiscordAppAnchor>
            <Link
              to="/login"
              className="clip-cta font-semibold inline-flex h-12 items-center gap-2 border border-white/15 bg-white/4 px-8 font-tech text-sm uppercase tracking-wider-2 transition hover:border-white/25 hover:bg-white/8"
            >
              Join Black Rose
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function GameServersTab() {
  return (
    <main className="relative bg-[oklch(0.05_0_0)]">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10">
          <p className="font-tech text-label-readable uppercase text-muted-foreground">
            Community Gaming
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-display text-white sm:text-4xl">
            Dedicated Servers
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            Black Rose runs dedicated community game servers. Join a server, play with guild
            members, and be part of the action.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <GameCard
            title="Palworld"
            subtitle="Community · Dedicated Servers"
            description="Black Rose runs four dedicated Palworld servers open to verified members. Check live player counts, server stats, and connection details."
            tag="Palworld"
            bannerSrc={palworldBanner}
            bannerAlt="Palworld"
            ctaLabel="View Servers"
            ctaHref="/servers"
            accentLine="from-emerald-400/80 via-emerald-400/20 to-transparent"
            accentTag="border-emerald-400/35 text-emerald-200 bg-emerald-500/8"
          />
        </div>
      </div>
    </main>
  );
}

function GameGuildsTab() {
  return (
    <main className="relative bg-[oklch(0.05_0_0)]">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10">
          <p className="font-tech text-label-readable uppercase text-muted-foreground">
            Community Gaming
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-display text-white sm:text-4xl">
            Game Guilds
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            Black Rose maintains in-game guilds across titles where the community plays together.
            Find your guild and apply to join.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <GameCard
            title="Where Winds Meet"
            subtitle="Community · In-Game Guilds"
            description="Four active Black Rose guilds in Where Winds Meet — Noir, Noctis, Enigma, and Umbra. Apply through the verification channel to join your guild."
            tag="WWM"
            bannerSrc={wwmBanner}
            bannerAlt="Where Winds Meet"
            ctaLabel="View Guilds"
            ctaHref="/guilds"
            accentLine="from-cyan-400/80 via-cyan-400/20 to-transparent"
            accentTag="border-cyan-400/35 text-cyan-100 bg-cyan-500/8"
          />
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TABS: { key: CommunityTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "servers", label: "Game Servers" },
  { key: "guilds", label: "Game Guilds" },
];

function CommunityPage() {
  const [activeTab, setActiveTab] = useState<CommunityTab>("overview");

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

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-4 inline-flex items-center gap-3 font-tech text-label-readable uppercase text-muted-foreground">
            <span className="h-px w-10 bg-border" />
            The Guild
          </div>

          <h1 className="font-display text-5xl tracking-display sm:text-6xl md:text-7xl">
            Community
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
            Black Rose is a player-first guild united by competition, respect, and a code we hold
            each other to — on and off the server.
          </p>
        </div>
      </section>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-white/[0.07] bg-[oklch(0.055_0_0)] backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 font-tech text-[11px] uppercase tracking-widest transition-all duration-150 ${
                  activeTab === tab.key
                    ? "bg-white text-background"
                    : "text-white/45 hover:bg-white/8 hover:text-white/75"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "servers" && <GameServersTab />}
      {activeTab === "guilds" && <GameGuildsTab />}

      <Footer />
    </div>
  );
}
