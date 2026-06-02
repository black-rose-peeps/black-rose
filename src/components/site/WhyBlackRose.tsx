import { SectionHeading } from "./SectionHeading";

const pillars = [
  {
    n: "I",
    title: "Professional Tournament Management",
    body: "Well-organized brackets, structured formats, and transparent competition operated by Black Rose staff.",
  },
  {
    n: "II",
    title: "Open Community Participation",
    body: "Players, teams, clans, and guilds from any community can compete on equal ground. No gatekeeping.",
  },
  {
    n: "III",
    title: "Competitive Integrity",
    body: "Verified participants, enforced rulesets, and reviewed match results protect the prestige of every win.",
  },
];

export function WhyBlackRose() {
  return (
    <section className="relative border-t border-border bg-card py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="02 — The Code"
          title="Why Black Rose"
          description="Three principles that define every match we host."
        />

        <div className="grid gap-px bg-border md:grid-cols-3">
          {pillars.map((p) => (
            <div
              key={p.n}
              className="group relative flex flex-col gap-8 bg-card p-10 transition hover:bg-secondary"
            >
              <div className="flex items-start justify-between">
                <span className="font-display text-6xl tracking-display text-muted-foreground/60 transition group-hover:text-foreground">
                  {p.n}
                </span>
                <span className="h-px w-12 translate-y-6 bg-border" />
              </div>
              <h3 className="font-display text-2xl leading-tight tracking-display">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.body}</p>
              <div className="mt-auto h-px w-full bg-border" />
              <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Principle / {p.n}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
