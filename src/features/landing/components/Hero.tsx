import { Link } from "@tanstack/react-router";
import heroBg from "@/assets/landing-hero-bg2.png";
import { useMemberSession } from "@/features/auth/hooks/useMemberSession";
import { Emblem } from "@/features/shared/components/Emblem";

export function Hero() {
  const session = useMemberSession();

  return (
    <section
      id="landing-hero"
      className="relative isolate overflow-hidden pt-32 pb-28 md:pt-44 md:pb-40"
    >
      {/* Background layers */}
      <div className="absolute inset-0 -z-20 grid-bg opacity-50" />
      <div
        className="absolute inset-0 -z-20 opacity-30 mix-blend-screen"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1) contrast(1.2)",
        }}
      />
      <div className="absolute inset-0 -z-10 radial-fade" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t from-background to-transparent" />

      {/* Geometric corner accents */}
      <div className="pointer-events-none absolute left-6 top-24 hidden h-32 w-32 border-l border-t border-border md:block" />
      <div className="pointer-events-none absolute right-6 top-24 hidden h-32 w-32 border-r border-t border-border md:block" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
        {/* Spinning emblem */}
        <div className="relative animate-rise">
          <div className="absolute inset-0 -m-8 rounded-full blur-3xl bg-foreground/5" />
          <Emblem spin className="mb-6 relative h-64 w-64 md:h-80 md:w-80 opacity-90" />
        </div>

        <div className="mb-6 inline-flex items-center gap-3 border border-border px-4 py-1.5 font-tech text-label-readable uppercase text-muted-foreground animate-rise">
          <span className="h-1.5 w-1.5 bg-foreground animate-pulse-soft" />
          Community Esports
        </div>

        <h1 className="font-display text-6xl leading-[0.9] tracking-display sm:text-7xl md:text-[7.5rem] animate-rise">
          RISE <span className="text-stroke">AS</span> ONE
        </h1>

        <p className="mt-8 max-w-2xl text-balance text-base text-muted-foreground md:text-lg animate-rise">
          Compete. Rise. Dominate. Join community-driven esports tournaments hosted by Black Rose
          and prove yourself against the best.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row animate-rise">
          <Link
            to={session ? "/dashboard" : "/login"}
            className="clip-cta font-semibold inline-flex h-12 items-center gap-3 bg-foreground px-8 font-tech text-sm uppercase tracking-wider-2 text-background hover:bg-foreground/90 transition"
          >
            {session ? "Go to Dashboard" : "Get Started"}
            <span aria-hidden>→</span>
          </Link>
          <Link
            to="/tournaments"
            className="clip-cta font-semibold inline-flex h-12 items-center gap-3 border border-border bg-transparent px-8 font-tech text-sm uppercase tracking-wider-2 text-foreground hover:bg-secondary transition"
          >
            View Tournaments
          </Link>
        </div>

        {/* Stats strip */}
        {/* <div className="mt-20 grid w-full max-w-3xl grid-cols-3 divide-x divide-border border-y border-border">
          {[
            { k: "1,240+", v: "Players" },
            { k: "186", v: "Teams" },
            { k: "₱120K", v: "Prize Awarded" },
          ].map((s) => (
            <div key={s.v} className="py-5">
              <div className="font-display text-3xl tracking-display md:text-4xl">{s.k}</div>
              <div className="mt-1 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                {s.v}
              </div>
            </div>
          ))}
        </div> */}
      </div>
    </section>
  );
}
