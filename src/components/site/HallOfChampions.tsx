import { SectionHeading } from "./SectionHeading";

const champs = [
  { team: "OBSIDIAN ORDER", tag: "OBS", tournament: "Valorant Spring Open", mvp: "kairo", date: "May 2026" },
  { team: "NOCTURNE EMPIRE", tag: "NCT", tournament: "MLBB Crown Series", mvp: "vex", date: "Mar 2026" },
  { team: "PALE KINGS", tag: "PLK", tournament: "CS2 Iron Cup", mvp: "renji", date: "Jan 2026" },
  { team: "HOUSE OF THORNS", tag: "HOT", tournament: "Valorant Winter Cup", mvp: "sable", date: "Dec 2025" },
];

export function HallOfChampions() {
  return (
    <section className="border-t border-border bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="03 — Legacy"
          title="Hall of Champions"
          description="Teams that carved their name into the Black Rose archive."
        />

        <ul className="divide-y divide-border border-y border-border">
          {champs.map((c, i) => (
            <li
              key={c.team}
              className="group grid grid-cols-12 items-center gap-4 py-6 transition hover:bg-card md:py-8"
            >
              <div className="col-span-1 font-display text-xl tracking-display text-muted-foreground">
                0{i + 1}
              </div>
              <div className="col-span-11 md:col-span-4 flex items-center gap-4">
                <div className="clip-tab grid h-12 w-12 place-items-center border border-border bg-secondary font-display tracking-display text-sm">
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
              <div className="col-span-3 md:col-span-1 text-right text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                {c.date}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
