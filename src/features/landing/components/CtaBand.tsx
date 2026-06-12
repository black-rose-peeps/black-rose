import { Link } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";

export function CtaBand() {
  return (
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

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-3 border border-white/10 bg-white/3 px-4 py-1.5 font-tech text-label-readable uppercase text-muted-foreground backdrop-blur-sm">
          <span className="h-1.5 w-1.5 bg-foreground animate-pulse-soft" />
          Registration Open
        </div>

        <h2 className="font-display text-5xl leading-[0.95] tracking-display md:text-7xl">
          Your name. <br />
          <span className="text-stroke">Etched in black.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
          Build your team, claim your bracket, and step into the arena. Black Rose runs the
          competition — you write the history.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/login"
            className="clip-cta inline-flex h-12 items-center gap-3 bg-foreground px-8 font-tech text-sm uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
          >
            Join Black Rose
            <span aria-hidden>→</span>
          </Link>
          <Link
            to="/tournaments"
            className="clip-cta inline-flex h-12 items-center gap-3 border border-white/15 bg-white/4 px-8 font-tech text-sm uppercase tracking-wider-2 transition hover:bg-white/8 hover:border-white/25"
          >
            Browse Tournaments
          </Link>
        </div>
      </div>
    </section>
  );
}
