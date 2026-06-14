import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { CommunityPortrait } from "@/features/community/components/CommunityPortrait";
import { GuildCodeGrid } from "@/features/community/components/GuildCodeGrid";
import { GUILD_MASTER_ATTRIBUTION } from "@/features/community/constants/guild-code";
import { DISCORD_SERVER_INVITE } from "@/features/auth/constants";
import { DiscordAppLinkDialog } from "@/features/shared/components/DiscordAppLinkDialog";
import { useDiscordAppLink } from "@/features/shared/hooks/useDiscordAppLink";
import { Emblem } from "@/features/shared/components/Emblem";

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

function CommunityPage() {
  const {
    pending: discordLinkPending,
    requestDiscordAppLink,
    confirmDiscordAppLink,
    cancelDiscordAppLink,
  } = useDiscordAppLink();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* ── Page hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/6 pt-32 pb-20">
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

          <div className="relative mt-12 overflow-hidden border border-white/8 bg-[oklch(0.055_0_0)] px-8 py-8 clip-tab md:px-10">
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
        {/* Grid texture */}
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        {/* Central radial spotlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(255,255,255,0.05),transparent)]" />
        {/* Top and bottom edge fades */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

        {/* Decorative spinning emblems */}
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
            <button
              type="button"
              onClick={() =>
                requestDiscordAppLink(DISCORD_SERVER_INVITE, "the Black Rose Discord server")
              }
              className="clip-cta font-semibold inline-flex h-12 items-center gap-2 bg-foreground px-8 font-tech text-sm uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
            >
              Join Discord
              <span aria-hidden>→</span>
            </button>
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

      <Footer />

      <DiscordAppLinkDialog
        pending={discordLinkPending}
        onConfirm={confirmDiscordAppLink}
        onCancel={cancelDiscordAppLink}
      />
    </div>
  );
}
