import { SectionHeading } from "./SectionHeading";

const champs = [
  {
    team: "OBSIDIAN ORDER",
    tag: "OBS",
    tournament: "Valorant Spring Open",
    mvp: "kairo",
    date: "May 2026",
  },
  {
    team: "NOCTURNE EMPIRE",
    tag: "NCT",
    tournament: "MLBB Crown Series",
    mvp: "vex",
    date: "Mar 2026",
  },
  {
    team: "PALE KINGS",
    tag: "PLK",
    tournament: "CS2 Iron Cup",
    mvp: "renji",
    date: "Jan 2026",
  },
  {
    team: "HOUSE OF THORNS",
    tag: "HOT",
    tournament: "Valorant Winter Cup",
    mvp: "sable",
    date: "Dec 2025",
  },
];

export function HallOfChampions() {
  return (
    <section
      id="champions"
      className="relative border-t border-white/[0.06] bg-background py-24 md:py-32 overflow-hidden scroll-mt-16"
    >
      {/* Subtle diagonal line texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 60px)",
        }}
      />
      {/* Top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,255,255,0.04),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="03 — Legacy"
          title="Hall of Champions"
          description="Teams that carved their name into the Black Rose archive."
        />

        <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {champs.map((c, i) => (
            <li
              key={c.team}
              className="group relative grid grid-cols-12 items-center gap-4 py-6 transition duration-200 hover:bg-white/[0.025] md:py-8"
            >
              {/* Left accent on hover */}
              <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-linear-to-b from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="col-span-1 font-display text-xl tracking-display text-white/20 group-hover:text-white/50 transition-colors duration-200">
                0{i + 1}
              </div>

              <div className="col-span-11 flex items-center gap-4 md:col-span-4">
                <div className="clip-tab grid h-12 w-12 shrink-0 place-items-center border border-white/10 bg-white/[0.05] font-display tracking-display text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] transition duration-200 group-hover:border-white/20 group-hover:bg-white/[0.08]">
                  {c.tag}
                </div>
                <div>
                  <div className="font-display text-xl tracking-display md:text-2xl">{c.team}</div>
                  <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Champion
                  </div>
                </div>
              </div>

              <div className="col-span-6 md:col-span-4">
                <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  Tournament
                </div>
                <div className="mt-1 text-sm">{c.tournament}</div>
              </div>

              <div className="col-span-3 md:col-span-2">
                <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  MVP
                </div>
                <div className="mt-1 text-sm">{c.mvp}</div>
              </div>

              <div className="col-span-3 text-right text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground md:col-span-1">
                {c.date}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
