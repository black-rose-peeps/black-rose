import { GameCard } from "./GameCard";
import wwmBanner from "@/assets/wwm-tournament-header.jpg";

export function GameGuildsTab() {
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
