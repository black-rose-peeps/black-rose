import type { BracketRound, BracketMatch } from "../../types";
import { splitBracketRounds } from "@/lib/mock-brackets";
import { isDoubleEliminationFormat } from "@/features/tournaments/constants/formats";

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

  const { main, grandFinals } = splitBracketRounds(bracket);
  const isDoubleElim = isDoubleEliminationFormat(format);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        <span className="h-px w-8 bg-white/10" />
        {format} Bracket
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <BracketRoundGrid rounds={main} />

      {grandFinals.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg uppercase tracking-wider text-foreground">
              Grand Final
            </span>
            <span className="h-px flex-1 bg-amber-400/30" />
          </div>
          <p className="text-xs text-muted-foreground">
            {isDoubleElim
              ? "Championship match — upper bracket winner vs lower bracket winner."
              : "Championship match — winners from the semifinals."}
          </p>
          <BracketRoundGrid rounds={grandFinals} highlight />
        </section>
      )}

      <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/40">
        TBD entries will be filled as the tournament progresses.
      </p>
    </div>
  );
}

function BracketRoundGrid({
  rounds,
  highlight = false,
}: {
  rounds: BracketRound[];
  highlight?: boolean;
}) {
  if (rounds.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="inline-grid gap-6"
        style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(220px, 1fr))` }}
      >
        {rounds.map((round) => (
          <div key={round.label} className="flex flex-col gap-4">
            <div
              className={`border-b pb-3 text-[10px] font-tech uppercase tracking-wider-2 ${
                highlight
                  ? "border-amber-400/40 text-amber-400/90"
                  : "border-white/8 text-muted-foreground"
              }`}
            >
              {round.label}
            </div>
            <div className="flex flex-col gap-3">
              {round.matches.map((match) => (
                <MatchCard key={match.id} match={match} highlight={highlight} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, highlight }: { match: BracketMatch; highlight?: boolean }) {
  const hasScores = match.scoreA !== undefined && match.scoreB !== undefined;

  return (
    <div
      className={`border bg-[oklch(0.07_0_0)] ${
        highlight ? "border-amber-400/35 ring-1 ring-amber-400/10" : "border-white/8"
      }`}
    >
      <TeamSlot
        name={match.teamA}
        score={match.scoreA}
        winner={!!(match.winner && match.teamA && match.winner === match.teamA)}
        hasScores={hasScores}
      />
      <div className="h-px bg-white/6" />
      <TeamSlot
        name={match.teamB}
        score={match.scoreB}
        winner={!!(match.winner && match.teamB && match.winner === match.teamB)}
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
