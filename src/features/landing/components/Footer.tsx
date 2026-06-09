import { Link } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";

export function Footer() {
  return (
    <footer className="relative border-t border-white/6 bg-[oklch(0.04_0_0)] overflow-hidden">
      {/* Very faint grid for texture */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      {/* Top edge highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <Emblem className="h-10 w-10 opacity-80" />
              <span className="font-display text-2xl tracking-wider-2">BLACK ROSE</span>
            </div>
            <p className="mt-6 max-w-sm text-sm text-muted-foreground leading-relaxed">
              The official home of community esports. Tournament organization, bracket management,
              and competitive integrity — built for players, by players.
            </p>
          </div>

          {[
            {
              title: "Compete",
              links: [
                { label: "Tournaments", to: "/tournaments" as const },
                { label: "Teams", to: null },
                { label: "Brackets", to: null },
                { label: "Standings", to: null },
              ],
            },
            {
              title: "Community",
              links: [
                { label: "News", to: null },
                { label: "Champions", to: null },
                { label: "Calendar", to: null },
                { label: "Discord", to: null },
              ],
            },
          ].map((c) => (
            <div key={c.title}>
              <div className="text-[10px] font-tech uppercase tracking-wider-2 text-white/30">
                {c.title}
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link
                        to={l.to}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="cursor-default text-muted-foreground/50"
                      >
                        {l.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/6 pt-8 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/60 md:flex-row md:items-center">
          <span>© 2026 Black Rose Esports. All rights reserved.</span>
          <span>Fight as One.</span>
        </div>
      </div>
    </footer>
  );
}
