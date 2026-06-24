import { openingPlayableMatchCount } from "@/features/admin/features/tournament-details/utils/bracket-field";

interface OpeningPlayInGuideProps {
  teamCount: number;
  variant?: "single" | "double" | "bye";
  bracketCapacity?: number;
  openingMatchCount?: number;
}

export function OpeningPlayInGuide({
  teamCount,
  variant = "double",
  bracketCapacity: capacity,
  openingMatchCount,
}: OpeningPlayInGuideProps) {
  const bracketSize = capacity ?? teamCount;
  const byes = bracketSize - teamCount;
  const openingMatches =
    openingMatchCount ?? (byes > 0 ? openingPlayableMatchCount(teamCount) : 0);

  const copy =
    variant === "bye" || byes > 0
      ? openingMatches > 0 && openingMatches < bracketSize / 4
        ? `${openingMatches} opening upper-bracket matches decide who joins the ${byes} bye seeds in round two. The bracket then runs as a standard ${bracketSize}-team tree.`
        : `Top seeds receive round-one byes. After byes resolve, the bracket continues as a standard ${bracketSize}-team tree.`
      : variant === "single"
        ? "Opening play-in winners fill the remaining main-bracket slots in Round 1. Top seeds are protected and skip play-in."
        : "Opening play-in winners join protected top seeds in Upper Round 2. Play-in losers wait in Lower Round 1 for an upper Round 2 loser.";

  const title =
    variant === "bye" || byes > 0
      ? openingMatches > 0 && openingMatches < bracketSize / 4
        ? `${teamCount}-team field · ${openingMatches} opening match${openingMatches === 1 ? "" : "es"} · ${byes} bye${byes === 1 ? "" : "s"}`
        : `${teamCount}-team field · ${byes} round-one bye${byes === 1 ? "" : "s"}`
      : `${teamCount}-team field · opening play-in`;

  return (
    <p className="rounded-md border border-border/70 bg-secondary/10 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      <span className="font-tech text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
        {title}
      </span>
      <span className="mt-1 block">{copy}</span>
    </p>
  );
}
