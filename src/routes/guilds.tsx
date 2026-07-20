import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { Emblem } from "@/features/shared/components/Emblem";
import { useMemberSession } from "@/features/auth/hooks/useMemberSession";
import { DiscordAppAnchor } from "@/features/shared/components/DiscordAppAnchor";
import { DISCORD_VERIFICATION_CHANNEL_URL } from "@/features/auth/constants";
import wwmGuildBanner from "@/assets/wwm-guild-header.jpg";
import wwmTournamentBanner from "@/assets/wwm-tournament-header.jpg";

export const Route = createFileRoute("/guilds")({
  head: () => ({
    meta: [
      { title: "In-Game Guilds — Black Rose" },
      {
        name: "description",
        content:
          "Meet the Black Rose guilds active in Where Winds Meet. Noir, Noctis, Enigma, and Umbra — four guilds, one community.",
      },
    ],
  }),
  component: GuildsPage,
});

// ---------------------------------------------------------------------------
// Static guild data — ordered: Noir, Noctis, Enigma, Umbra
// ---------------------------------------------------------------------------

interface Guild {
  name: string;
  guildKey: "Noir" | "Noctis" | "Enigma" | "Umbra";
  description: string;
}

const WWM_GUILDS: Guild[] = [
  {
    name: "Noir",
    guildKey: "Noir",
    description:
      "The founding guild of Black Rose in Where Winds Meet. Noir is open to members who want to be part of the community from the ground up and help shape how Black Rose grows in the game.",
  },
  {
    name: "Noctis",
    guildKey: "Noctis",
    description:
      "A guild for members who are active and engaged in the community. Noctis brings together players who enjoy group content and staying connected through events and regular play sessions.",
  },
  {
    name: "Enigma",
    guildKey: "Enigma",
    description:
      "A guild for players who enjoy diving deeper into the game's systems and strategies. Enigma brings together members who value preparation, coordination, and continuous improvement.",
  },
  {
    name: "Umbra",
    guildKey: "Umbra",
    description:
      "Built for players who prefer a focused, measured approach to the game. Umbra values consistency and teamwork, making it a solid home for dedicated Black Rose members.",
  },
];

// Application template — pre-fills the guild name
function buildApplicationTemplate(guildKey: Guild["guildKey"]): string {
  return `IGN:
UID:
Class:
Platform: PC / PS5 / Mobile
Nationality:
Already in the clan? (Yes/No):
Applying for: BLKRose-${guildKey}
Streaming Page: (Twitch, TikTok, Facebook, YouTube – optional)`;
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="clip-cta inline-flex h-9 items-center gap-2 bg-foreground px-4 font-tech text-[10px] uppercase tracking-wider text-background transition hover:bg-foreground/90"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label}
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Application modal
// ---------------------------------------------------------------------------

function ApplyModal({ guild, onClose }: { guild: Guild; onClose: () => void }) {
  const template = buildApplicationTemplate(guild.guildKey);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Apply to BLKRose-${guild.guildKey}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg border border-white/12 bg-[oklch(0.07_0_0)]">
        {/* Corner brackets */}
        <span className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l border-t border-white/25" />
        <span className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r border-t border-white/25" />
        <span className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b border-l border-white/15" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-white/15" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/8 px-6 py-4">
          <div>
            <p className="font-tech text-[10px] uppercase tracking-wider text-white/40">
              Guild Application
            </p>
            <h2 className="mt-0.5 font-display text-2xl tracking-display text-white">
              BLKRose-{guild.guildKey}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center border border-white/15 bg-white/5 transition-colors hover:border-white/30 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5 text-white/60" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="mb-4 text-sm leading-6 text-white/50">
            Copy the template below, fill in your details, then post it in the Black Rose Discord
            verification channel.
          </p>

          {/* Template */}
          <pre className="mb-4 overflow-x-auto whitespace-pre-wrap border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm leading-6 text-white/80">
            {template}
          </pre>

          <div className="flex flex-wrap items-center gap-3">
            <CopyButton value={template} label="Copy Template" />
            {/* Opens the exact verification channel */}
            <DiscordAppAnchor
              discordUrl={DISCORD_VERIFICATION_CHANNEL_URL}
              className="clip-cta inline-flex h-9 items-center gap-2 border border-white/15 bg-white/4 px-4 font-tech text-[10px] uppercase tracking-wider text-white/60 transition hover:border-white/25 hover:bg-white/8 hover:text-white"
            >
              Open Verification Channel →
            </DiscordAppAnchor>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guild card — Apply button in card footer
// ---------------------------------------------------------------------------

function GuildCard({
  guild,
  index,
  onApply,
  isAuthenticated,
}: {
  guild: Guild;
  index: number;
  onApply: (guild: Guild) => void;
  isAuthenticated: boolean;
}) {
  const ordinal = String(index + 1).padStart(2, "0");

  return (
    <article className="clip-angle-lg group relative flex flex-col overflow-hidden border border-white/[0.07] bg-[oklch(0.055_0_0)] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] transition duration-500 hover:shadow-[0_24px_64px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset]">
      {/* Cyberpunk corner brackets */}
      <span className="pointer-events-none absolute left-0 top-0 z-10 h-5 w-5 border-l border-t border-white/20" />
      <span className="pointer-events-none absolute right-0 top-0 z-10 h-5 w-5 border-r border-t border-white/20" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-10 h-5 w-5 border-b border-l border-white/15" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-5 w-5 border-b border-r border-white/15" />

      {/* WWM banner header */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={wwmTournamentBanner}
          alt="Where Winds Meet"
          className="h-full w-full object-cover object-center brightness-[0.55] saturate-[0.55] transition duration-700 group-hover:brightness-70 group-hover:saturate-80"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.055_0_0)] via-[oklch(0.055_0_0/0.35)] to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

        {/* Ordinal */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute bottom-4 left-4 font-display text-5xl tracking-display text-white/10 transition duration-300 group-hover:text-white/20"
        >
          {ordinal}
        </p>
      </div>

      {/* Card body */}
      <div className="relative flex flex-1 flex-col px-5 pt-4 pb-0">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.15]" />

        <div className="relative">
          <p className="font-tech text-label-readable uppercase tracking-[0.08em] text-muted-foreground">
            Black Rose · WWM
          </p>
          <h3 className="mt-1 font-display text-3xl tracking-display text-white leading-tight">
            {guild.name}
          </h3>
        </div>

        {/* <div className="relative mt-4 border-t border-white/[0.07] pt-4 flex-1">
          <p className="text-sm leading-6 text-white/50">{guild.description}</p>
        </div> */}
      </div>

      {/* Card footer — Apply CTA always at the bottom */}
      <div className="relative px-5 pb-5 pt-4">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.15]" />
        <div className="relative border-t border-white/[0.07] pt-4">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onApply(guild)}
              className="cursor-pointer clip-cta inline-flex h-10 w-full items-center justify-center gap-2 bg-foreground font-tech text-[10px] uppercase tracking-wider text-background transition hover:bg-foreground/90"
            >
              Apply Now
              <span aria-hidden>→</span>
            </button>
          ) : (
            <Link
              to="/login"
              search={{ redirect_to: "/guilds" }}
              className="clip-cta inline-flex h-10 w-full items-center justify-center gap-2 border border-white/15 bg-white/4 font-tech text-[10px] uppercase tracking-wider text-white/60 transition hover:border-white/25 hover:bg-white/8 hover:text-white"
            >
              Sign In to Apply
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function GuildsPage() {
  const session = useMemberSession();
  const isAuthenticated = session !== null;
  const [activeGuild, setActiveGuild] = useState<Guild | null>(null);

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

        {/* WWM banner watermark */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.12]"
          style={{
            backgroundImage: `url(${wwmGuildBanner})`,
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

          <h1 className="font-display text-5xl tracking-display sm:text-6xl md:text-7xl">
            In-Game Guilds
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
            Black Rose runs four active guilds in Where Winds Meet. Find your guild, apply, and rise
            together in the world.
          </p>

          {/* Stats strip — matches servers page pattern */}
          <div className="mt-10 inline-grid grid-cols-3 divide-x divide-white/8 border border-white/8 bg-white/2.5">
            {[
              { label: "Active Guilds", value: WWM_GUILDS.length },
              { label: "Platform", value: "PC · PS5 · Mobile" },
            ].map((s) => (
              <div key={s.label} className="px-6 py-5">
                <div className="font-display text-3xl tracking-display md:text-4xl">{s.value}</div>
                <div className="mt-1 font-tech text-label-readable uppercase text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Guild grid ────────────────────────────────────── */}
      <main className="relative bg-[oklch(0.05_0_0)]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

        <div className="relative mx-auto max-w-7xl px-6 py-14">
          <div className="mb-8">
            <p className="font-tech text-label-readable uppercase text-muted-foreground">
              Where Winds Meet
            </p>
            <h2 className="mt-1 font-display text-3xl tracking-display text-white">
              Active Guilds
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {WWM_GUILDS.map((guild, i) => (
              <GuildCard
                key={guild.name}
                guild={guild}
                index={i}
                onApply={setActiveGuild}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>

          {/* <p className="mt-10 text-center font-tech text-[10px] uppercase tracking-wider text-white/20">
            Guild membership is managed through the Black Rose Discord. Apply using the form on each
            card, then post it in the verification channel.
          </p> */}
        </div>
      </main>

      <Footer />

      {/* ── Application modal ──────────────────────────────── */}
      {activeGuild && <ApplyModal guild={activeGuild} onClose={() => setActiveGuild(null)} />}
    </div>
  );
}
