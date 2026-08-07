import { Link } from "@tanstack/react-router";
import { CommunityPortrait } from "./CommunityPortrait";
import { GuildCodeGrid } from "./GuildCodeGrid";
import { GUILD_MASTER_ATTRIBUTION } from "../constants/guild-code";
import { Emblem } from "@/features/shared/components/Emblem";
import { useMemberSession } from "@/features/auth/hooks/useMemberSession";

export function OverviewTab() {
  const session = useMemberSession();
  const isAuthenticated = session !== null;

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
              We value growth, patience, and longevity. Like fine wine, we improve with time — as
              players, as teammates, and as a guild.
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
            Ready to move forward as one?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
            Individual wins strengthen the guild. When one member succeeds, we all move forward
            together.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="clip-cta font-semibold inline-flex h-12 items-center gap-2 bg-foreground px-8 font-tech text-sm uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
            >
              {isAuthenticated ? "Go to Dashboard" : "Join Black Rose"}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
