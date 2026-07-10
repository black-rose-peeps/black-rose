/** Compact command center header for mobile admin dashboard. */
export function DashboardMobileHero() {
  return (
    <section className="relative overflow-hidden border border-white/[0.08] bg-[oklch(0.08_0_0)] px-4 py-5 md:hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-white/[0.04] to-transparent" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-px w-6 bg-border" />
          Operations
        </div>
        <h1 className="mt-2 font-display text-2xl tracking-wider text-foreground">
          Command Center
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Members, rosters, and live events at a glance.
        </p>
      </div>
    </section>
  );
}
