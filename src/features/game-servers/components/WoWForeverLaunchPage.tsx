import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { Button } from "@/components/ui/button";
import { DISCORD_SERVER_INVITE } from "@/features/auth/constants";
import { DiscordAppAnchor } from "@/features/shared/components/DiscordAppAnchor";
import { useActiveGames } from "@/features/admin/features/games/hooks/useGames";
import { useWoWForeverCountdown } from "../hooks/useWoWForeverCountdown";
import { isWoWForever } from "../utils/wow-forever-launch";
import { WoWForeverCountdown } from "./WoWForeverCountdown";
import { WoWForeverAnnouncement } from "./WoWForeverAnnouncement";

function LaunchDetails({ label }: { label: string }) {
  const countdown = useWoWForeverCountdown(true);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(350px,500px)] lg:gap-12">
      <div className="min-w-0">
        <h1 className="break-words font-display text-4xl leading-tight tracking-display sm:text-5xl">
          {label}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Black Rose is heading into World of Warcraft: Forever. Experienced raiders and first-time
          adventurers are welcome.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Horde · PvP · Black Rose</p>

        <div className="my-8 border-y border-white/10 py-5">
          {!ready ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading launch time…
            </p>
          ) : countdown ? (
            <WoWForeverCountdown label={label} countdown={countdown} />
          ) : (
            <div role="status">
              <p className="text-base font-medium">Now live</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                The countdown is over. Join the community and begin your adventure.
              </p>
            </div>
          )}
        </div>

        <section aria-labelledby="wow-join-heading">
          <h2 id="wow-join-heading" className="font-display text-2xl tracking-display">
            Find your people in Azeroth
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            Whether you have played for years or are just getting started, there is a place for you
            here. Join our Discord and connect with the Black Rose WoW community.
          </p>
          <Button
            asChild
            className="mt-5 min-h-11 rounded-none bg-white px-5 text-sm text-black hover:bg-white/90"
          >
            <DiscordAppAnchor discordUrl={DISCORD_SERVER_INVITE}>Join Discord</DiscordAppAnchor>
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Follow the server’s verification steps, then let the community know you are here for WoW
            Forever.
          </p>
        </section>
      </div>
      <WoWForeverAnnouncement />
    </div>
  );
}

/** Active-only campaign content; a direct URL cannot bypass catalog availability. */
export function WoWForeverLaunchPage() {
  const catalog = useActiveGames();
  const game =
    !catalog.isPending && !catalog.isError
      ? catalog.data?.find((entry) => entry.is_active && isWoWForever(entry))
      : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="site-header-offset-spaced mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Link
          to="/community"
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to Community
        </Link>
        {catalog.isPending ? (
          <p role="status" className="py-12 text-sm text-muted-foreground">
            Loading community details…
          </p>
        ) : catalog.isError ? (
          <section role="alert" className="py-12">
            <h1 className="font-display text-3xl tracking-display">
              Community details unavailable
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We could not load the game catalog. Please try again.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 min-h-11 rounded-none"
              onClick={() => void catalog.refetch()}
            >
              Retry
            </Button>
          </section>
        ) : !game ? (
          <section className="py-12">
            <h1 className="font-display text-3xl tracking-display">Game currently unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Visit Community to explore our available games.
            </p>
          </section>
        ) : (
          <LaunchDetails key={game.id} label={game.display_name} />
        )}
      </main>
      <Footer />
    </div>
  );
}
