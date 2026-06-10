import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ChampionshipTitle } from "../types";
import { ChampionMarkGroup } from "./ChampionMarkGroup";

interface ChampionshipTitlesCardProps {
  titles: ChampionshipTitle[];
  label?: string;
}

/** Profile / dashboard panel listing championship wins. */
export function ChampionshipTitlesCard({
  titles,
  label = "Championship Legacy",
}: ChampionshipTitlesCardProps) {
  if (!titles.length) return null;

  return (
    <div className="border border-white/8 bg-[oklch(0.07_0_0)] p-5 clip-tab">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          {label}
        </p>
        <ChampionMarkGroup titles={titles} size="sm" />
      </div>
      <ul className="flex flex-col gap-2.5">
        {titles.map((title) => (
          <li key={`${title.tournamentId}-${title.teamId}`}>
            <Link
              to="/tournaments/$id"
              params={{ id: title.tournamentId }}
              className="group flex items-center justify-between gap-3 rounded-sm border border-transparent px-1 py-1 transition hover:border-white/8 hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-sm tracking-display text-foreground group-hover:text-white">
                  {title.tournamentName}
                </p>
                <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  {title.teamName} [{title.teamTag}] · {title.game}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
