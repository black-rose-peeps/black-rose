import type { BracketRound, BracketMatch } from "../../types";

interface BracketTabProps {
  bracket: BracketRound[];
  format: string;
}

export function BracketTab({ bracket, format }: BracketTabProps) {
  if (bracket.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 border border-white/8 bg-[oklch(0.07_0_0)] py-24 text-center">
        <p className="font-display text-2xl tracking-display text-muted-foreground/50">
          Bracket Not Set
        </p>
        <p className="text-sm text-muted-foreground/40">
          The bracket will be published once registration closes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Format label */}
      <div className="flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        <span className="h-px w-8 bg-white/10" />
        {format} Bracket
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* Bracket grid — one column per round */}
      <div className="overflow-x-auto pb-4">
        <div
          className="inline-grid gap-6"
          style={{ gridTemplateColumns: `repeat(${bracket.length}, minmax(220px, 1fr))` }}
        >
          {bracket.map((round) => (
            <div key={round.label} className="flex flex-col gap-4">
              {/* Round header */}
              <div className="border-b border-white/8 pb-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                {round.label}
              </div>

              {/* Matches — vertically spaced proportionally */}
              <div className="flex flex-col gap-3">
                {round.matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/40">
        TBD entries will be filled as the tournament progresses.
      </p>
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const hasScores = match.scoreA !== undefined && match.scoreB !== undefined;

  return (
    <div className="border border-white/8 bg-[oklch(0.07_0_0)]">
      <TeamSlot
        name={match.teamA}
        score={match.scoreA}
        winner={match.winner === match.teamA}
        hasScores={hasScores}
      />
      <div className="h-px bg-white/6" />
      <TeamSlot
        name={match.teamB}
        score={match.scoreB}
        winner={match.winner === match.teamB}
        hasScores={hasScores}
      />
    </div>
  );
}

function TeamSlot({
  name,
  score,
  winner,
  hasScores,
}: {
  name: string | null;
  score?: number;
  winner: boolean;
  hasScores: boolean;
}) {
  const isEmpty = name === null;

  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 ${
        winner ? "bg-white/8" : ""
      } ${isEmpty ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-2.5">
        {/* Win indicator */}
        <span className={`h-3.5 w-0.5 ${winner && hasScores ? "bg-white" : "bg-transparent"}`} />
        <span
          className={`text-xs font-medium ${
            isEmpty
              ? "text-muted-foreground/40 italic"
              : winner && hasScores
                ? "text-white"
                : "text-muted-foreground"
          }`}
        >
          {isEmpty ? "TBD" : name}
        </span>
      </div>
      {hasScores && !isEmpty && (
        <span
          className={`font-display text-base tracking-display ${
            winner ? "text-white" : "text-muted-foreground/60"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}
