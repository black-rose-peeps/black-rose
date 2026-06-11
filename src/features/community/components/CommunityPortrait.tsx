import communityPhoto from "@/assets/community-pic.png";

export function CommunityPortrait() {
  return (
    <section className="relative overflow-hidden border-y border-white/6 bg-[oklch(0.05_0_0)] py-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-10 max-w-2xl">
          <p className="font-tech text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            The Roster
          </p>
          <h2 className="mt-3 font-display text-3xl tracking-[0.04em] text-white md:text-4xl">
            We move as one.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            Black Rose is more than brackets and brackets alone — it is the people behind every
            match, every scrim, and every late-night call. This is us, united.
          </p>
        </div>

        <div className="group relative overflow-hidden border border-white/8 bg-[oklch(0.055_0_0)] clip-angle-lg shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
          <span className="pointer-events-none absolute left-0 top-0 z-20 h-6 w-6 border-l border-t border-white/25" />
          <span className="pointer-events-none absolute right-0 top-0 z-20 h-6 w-6 border-r border-t border-white/25" />
          <span className="pointer-events-none absolute bottom-0 left-0 z-20 h-6 w-6 border-b border-l border-white/15" />
          <span className="pointer-events-none absolute bottom-0 right-0 z-20 h-6 w-6 border-b border-r border-white/15" />

          <div className="relative aspect-[21/9] min-h-[220px] w-full overflow-hidden sm:min-h-[280px] md:min-h-[360px]">
            <img
              src={communityPhoto}
              alt="Black Rose guild — full community group photo"
              className="h-full w-full object-cover object-center contrast-105 saturate-90 transition duration-700 group-hover:scale-[1.02] group-hover:saturate-100"
            />

            <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.055_0_0)] via-[oklch(0.055_0_0/0.25)] to-black/10" />
            <div className="absolute inset-0 bg-linear-to-r from-black/40 via-transparent to-black/25" />

            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)",
              }}
            />

            <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-[#ff4655]/70 via-white/20 to-transparent" />
          </div>

          <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/8 px-6 py-5 md:px-8">
            <div>
              <p className="font-tech text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                Black Rose Guild
              </p>
              <p className="mt-1 font-display text-2xl tracking-[0.06em] text-white">
                Fight as One
              </p>
            </div>
            <p className="max-w-sm text-right text-[10px] font-tech uppercase tracking-[0.18em] text-white/40 md:text-xs">
              One community · One standard · One legacy
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
