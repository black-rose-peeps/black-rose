import { TournamentGrid } from "./TournamentGrid";
import type { Tournament } from "../types";

/** Labelled section group used on the tournament directory page. */
export function TournamentGroup({
  label,
  dot,
  tournaments,
}: {
  label: string;
  dot?: string;
  tournaments: Tournament[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
        {label}
        <span className="h-px flex-1 bg-white/6" />
      </div>
      <TournamentGrid tournaments={tournaments} />
    </div>
  );
}
