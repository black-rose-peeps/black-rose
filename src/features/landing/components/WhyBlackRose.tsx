import { Link } from "@tanstack/react-router";
import { SectionHeading } from "./SectionHeading";

const pillars = [
  {
    n: "I",
    title: "Integrity & Trust",
    body: "We lead with honesty and transparency, and act with prudence to protect our members, our reputation, and the community we've built.",
  },
  {
    n: "II",
    title: "Growth Through Passion",
    body: "Built on love for the game, not obligation. We value patience and longevity over shortcuts — improving as players, teammates, and as a community.",
  },
  {
    n: "III",
    title: "Community First",
    body: "Every win strengthens the whole, not just the individual. We listen, we lift each other up, and we give back to the community that built us.",
  },
];

export function WhyBlackRose() {
  return (
    <section
      id="why-black-rose"
      className="relative border-t border-white/[0.06] bg-[oklch(0.07_0_0)] py-24 md:py-32 overflow-hidden scroll-mt-16"
    >
      {/* Background texture */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      {/* Radial spotlight from top-center */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.05),transparent)]" />
      {/* Bottom fade into next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="The Code"
            title="Why Black Rose"
            description="The values that guide everything we build, host, and compete for."
            className="mb-0"
          />
          <Link
            to="/community"
            className="self-start font-semibold text-xs font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground md:self-end"
          >
            Guild Code of Values →
          </Link>
        </div>

        <div className="grid gap-px bg-white/[0.05] md:grid-cols-3">
          {pillars.map((p) => (
            <div
              key={p.n}
              className="group relative flex flex-col gap-8 overflow-hidden bg-[oklch(0.07_0_0)] p-10 transition duration-300 hover:bg-[oklch(0.10_0_0)]"
            >
              {/* Inner top-edge highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
              {/* Hover glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-white/[0.04] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="flex items-start justify-between">
                <span className="font-display text-6xl tracking-display text-white/20 transition duration-300 group-hover:text-white/60">
                  {p.n}
                </span>
                <span className="h-px w-12 translate-y-6 bg-white/10 transition-all duration-300 group-hover:bg-white/30 group-hover:w-16" />
              </div>
              <h3 className="font-display text-2xl leading-tight tracking-display">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              <div className="mt-auto h-px w-full bg-white/[0.06] transition-all duration-300 group-hover:bg-white/15" />
              <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/60">
                Principle / {p.n}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
