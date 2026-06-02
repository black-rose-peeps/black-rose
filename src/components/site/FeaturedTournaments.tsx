import valorant from "@/assets/tournament-valorant.jpg";
import mlbb from "@/assets/tournament-mlbb.jpg";
import cs2 from "@/assets/tournament-cs2.jpg";
import { SectionHeading } from "./SectionHeading";

const tournaments = [
  {
    img: valorant,
    name: "Valorant Nightfall Cup",
    game: "Valorant · 5v5",
    prize: "₱10,000",
    slots: "12 / 16",
    deadline: "Aug 31",
    status: "Open",
  },
  {
    img: mlbb,
    name: "MLBB Midnight Clash",
    game: "Mobile Legends · 5v5",
    prize: "₱8,000",
    slots: "9 / 16",
    deadline: "Sep 07",
    status: "Open",
  },
  {
    img: cs2,
    name: "CS2 Iron Bloom Invitational",
    game: "Counter-Strike 2 · 5v5",
    prize: "₱15,000",
    slots: "8 / 8",
    deadline: "Closed",
    status: "Full",
  },
];

export function FeaturedTournaments() {
  return (
    <section className="border-t border-border bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="01 — Active Now"
            title="Featured Tournaments"
            description="Hand-curated, professionally organized competitive events. Lock in your roster before registration closes."
          />
          <button className="self-start text-xs font-tech uppercase tracking-wider-2 text-muted-foreground hover:text-foreground transition md:self-end">
            View all tournaments →
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <article
              key={t.name}
              className="group clip-angle-lg relative flex flex-col border border-border bg-card transition hover:border-foreground/60"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={t.img}
                  alt={t.name}
                  loading="lazy"
                  className="h-full w-full object-cover grayscale transition duration-700 group-hover:grayscale-0 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <div className="absolute left-4 top-4 flex items-center gap-2 border border-border bg-background/80 px-2.5 py-1 text-[10px] font-tech uppercase tracking-wider-2 backdrop-blur">
                  <span
                    className={`h-1.5 w-1.5 ${t.status === "Open" ? "bg-foreground animate-pulse-soft" : "bg-muted-foreground"}`}
                  />
                  {t.status === "Open" ? "Registration Open" : "Slots Full"}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  {t.game}
                </div>
                <h3 className="mt-2 font-display text-2xl leading-tight tracking-display">
                  {t.name}
                </h3>

                <dl className="mt-6 grid grid-cols-3 gap-3 border-y border-border py-4 text-left">
                  <div>
                    <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                      Prize
                    </dt>
                    <dd className="mt-1 font-display text-lg tracking-display">{t.prize}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                      Slots
                    </dt>
                    <dd className="mt-1 font-display text-lg tracking-display">{t.slots}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                      Deadline
                    </dt>
                    <dd className="mt-1 font-display text-lg tracking-display">{t.deadline}</dd>
                  </div>
                </dl>

                <button
                  disabled={t.status !== "Open"}
                  className="mt-6 clip-cta inline-flex h-11 items-center justify-center gap-2 bg-foreground px-5 font-tech text-xs uppercase tracking-wider-2 text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
                >
                  {t.status === "Open" ? "Register" : "Closed"}
                  {t.status === "Open" && <span aria-hidden>→</span>}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
