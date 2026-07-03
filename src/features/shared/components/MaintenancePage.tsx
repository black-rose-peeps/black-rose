import blackRoseEmblem from "@/assets/black-rose-emblem-black.png";

export function MaintenancePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-12 text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,24,93,0.22),transparent_45%),radial-gradient(circle_at_bottom,rgba(127,29,29,0.18),transparent_40%)]"
        aria-hidden="true"
      />

      <section
        className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur md:p-12"
        role="status"
        aria-live="polite"
      >
        <img
          src={blackRoseEmblem}
          alt="Black Rose"
          className="mx-auto h-24 w-24 rounded-full bg-white p-2 object-contain shadow-lg md:h-28 md:w-28"
        />

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.35em] text-rose-300">
          System maintenance
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
          Black Rose Arena is temporarily unavailable
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/70 md:text-lg">
          We are upgrading our servers and migrating the platform database. Access will return
          after the migration and validation checks are complete.
        </p>

        <div className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm text-white/70">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-400" aria-hidden="true" />
          No action is required
        </div>
      </section>
    </main>
  );
}
