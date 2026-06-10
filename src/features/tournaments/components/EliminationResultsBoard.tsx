import { Medal, Trophy } from "./TournamentResultsBoard";
import { placementsToResultsEntries, TournamentResultsBoard } from "./TournamentResultsBoard";
import type { TournamentPlacement } from "../utils/tournament-placements";

interface EliminationResultsBoardProps {
  placements: TournamentPlacement[];
  teamTags?: Map<string, string>;
  className?: string;
}

export function EliminationResultsBoard({
  placements,
  teamTags,
  className,
}: EliminationResultsBoardProps) {
  if (placements.length === 0) return null;

  const entries = placementsToResultsEntries(
    placements.map((placement) => ({
      ...placement,
      tag: teamTags?.get(placement.team),
    })),
  );

  return (
    <TournamentResultsBoard
      className={className}
      eyebrow="Bracket — Final placements"
      sections={[
        {
          title: "Podium",
          subtitle: "Tournament finish",
          count: placements.length,
          entries,
          emptyLabel: "Final match not decided yet.",
          tone: "podium",
          icon: <Trophy className="h-4 w-4" strokeWidth={1.5} />,
        },
      ]}
    />
  );
}

export function PodiumPreviewBoard({
  title,
  placements,
  teamTags,
  className,
}: {
  title?: string;
  placements: TournamentPlacement[];
  teamTags?: Map<string, string>;
  className?: string;
}) {
  if (placements.length === 0) return null;

  return (
    <TournamentResultsBoard
      className={className}
      eyebrow={title ?? "Bracket — Current leaders"}
      sections={[
        {
          title: "Standings",
          subtitle: "Based on bracket results",
          count: placements.length,
          entries: placementsToResultsEntries(
            placements.map((placement) => ({
              ...placement,
              tag: teamTags?.get(placement.team),
            })),
          ),
          emptyLabel: "",
          tone: "podium",
          icon: <Medal className="h-4 w-4" strokeWidth={1.5} />,
        },
      ]}
    />
  );
}
