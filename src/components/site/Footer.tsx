import { Emblem } from "./Emblem";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <Emblem className="h-10 w-10" />
              <span className="font-display text-2xl tracking-wider-2">BLACK ROSE</span>
            </div>
            <p className="mt-6 max-w-sm text-sm text-muted-foreground">
              The official home of community esports. Tournament organization, bracket management,
              and competitive integrity — built for players, by players.
            </p>
          </div>
          {[
            { title: "Compete", links: ["Tournaments", "Teams", "Brackets", "Standings"] },
            { title: "Community", links: ["News", "Champions", "Calendar", "Discord"] },
          ].map((c) => (
            <div key={c.title}>
              <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                {c.title}
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-foreground text-muted-foreground transition">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground md:flex-row md:items-center">
          <span>© 2026 Black Rose Esports. All rights reserved.</span>
          <span>Forge Your Legacy.</span>
        </div>
      </div>
    </footer>
  );
}
