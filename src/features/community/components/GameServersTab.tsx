import { GameCard } from "./GameCard";
import palworldBanner from "/palworld-banner.png";

export function GameServersTab() {
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
