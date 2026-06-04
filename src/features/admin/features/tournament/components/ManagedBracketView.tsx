import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";
import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "../utils/managed-bracket";
import { winsRequired } from "../utils/managed-bracket";

const CARD_W = 220;
const CARD_H = 100;
const MATCH_GAP = 16;
const COL_GAP = 56;
const PAD_V = 24;

interface ManagedBracketViewProps {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
  roundFormats: Record<string, BestOfFormat>;
  teams: TournamentTeam[];
  isDoubleElim: boolean;
  onFormatChange: (roundId: string, format: BestOfFormat) => void;
  onScoreChange: (matchId: string, scoreA: number, scoreB: number) => void;
  onPickWinner: (matchId: string, winner: string) => void;
}

export function ManagedBracketView({
  matches,
  roundMetas,
  roundFormats,
  teams,
  isDoubleElim,
  onFormatChange,
  onScoreChange,
  onPickWinner,
}: ManagedBracketViewProps) {
  if (roundMetas.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No bracket rounds to display.
      </p>
    );
  }

  const teamByName = new Map(teams.map((t) => [t.name, t]));

  if (isDoubleElim) {
    const upperRounds = roundMetas.filter((r) => r.side === "upper" || r.side === "grand");
    const lowerRounds = roundMetas.filter((r) => r.side === "lower");

    return (
      <div className="space-y-8">
        <BracketSection
          title="Upper Bracket"
          roundMetas={upperRounds}
          matches={matches}
          roundFormats={roundFormats}
          teamByName={teamByName}
          onFormatChange={onFormatChange}
          onScoreChange={onScoreChange}
          onPickWinner={onPickWinner}
        />
        <BracketSection
          title="Lower Bracket"
          roundMetas={lowerRounds}
          matches={matches}
          roundFormats={roundFormats}
          teamByName={teamByName}
          onFormatChange={onFormatChange}
          onScoreChange={onScoreChange}
          onPickWinner={onPickWinner}
        />
        <p className="text-xs text-muted-foreground">
          Winners advance up; losers drop to the lower bracket. Grand Final: upper-bracket winner vs
          lower-bracket winner.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BracketSection
        roundMetas={roundMetas}
        matches={matches}
        roundFormats={roundFormats}
        teamByName={teamByName}
        onFormatChange={onFormatChange}
        onScoreChange={onScoreChange}
        onPickWinner={onPickWinner}
      />
      <p className="text-xs text-muted-foreground">
        Winners advance automatically. Set BO format per round; first to the required map wins
        advances.
      </p>
    </div>
  );
}

function BracketSection({
  title,
  roundMetas,
  matches,
  roundFormats,
  teamByName,
  onFormatChange,
  onScoreChange,
  onPickWinner,
}: {
  title?: string;
  roundMetas: BracketRoundMeta[];
  matches: ManagedMatch[];
  roundFormats: Record<string, BestOfFormat>;
  teamByName: Map<string, TournamentTeam>;
  onFormatChange: (roundId: string, format: BestOfFormat) => void;
  onScoreChange: (matchId: string, scoreA: number, scoreB: number) => void;
  onPickWinner: (matchId: string, winner: string) => void;
}) {
  if (roundMetas.length === 0) return null;

  const maxMatches = Math.max(...roundMetas.map((r) => r.matchIds.length), 1);
  const canvasHeight = maxMatches * CARD_H + (maxMatches - 1) * MATCH_GAP + PAD_V * 2 + 36;
  const totalW = roundMetas.length * (CARD_W + COL_GAP) + 40;

  function matchTop(index: number, count: number): number {
    if (count <= 1) return PAD_V + 36 + (canvasHeight - PAD_V * 2 - 36 - CARD_H) / 2;
    const contentH = canvasHeight - PAD_V * 2 - 36;
    const spacing = (contentH - CARD_H) / (count - 1);
    return PAD_V + 36 + index * spacing;
  }

  return (
    <div>
      {title && (
        <div className="mb-3 flex items-center gap-3">
          <span className="font-display text-sm uppercase tracking-wider text-foreground/90">
            {title}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      <div className="custom-scrollbar overflow-auto pb-2">
        <div
          className="relative min-w-full"
          style={{ width: `${totalW}px`, height: `${canvasHeight}px`, minHeight: 280 }}
        >
          {roundMetas.map((round, colIndex) => {
            const x = colIndex * (CARD_W + COL_GAP) + 20;
            const roundMatches = round.matchIds
              .map((id) => matches.find((m) => m.id === id))
              .filter((m): m is ManagedMatch => !!m);
            const format = roundFormats[round.id] ?? "BO3";
            const sideBorder =
              round.side === "grand"
                ? "border-amber-400/50"
                : round.side === "lower"
                  ? "border-amber-400/25"
                  : "border-border";

            return (
              <div key={round.id}>
                <div
                  className="absolute top-0 flex flex-col gap-1"
                  style={{ left: `${x}px`, width: `${CARD_W}px` }}
                >
                  <span
                    className={cn(
                      "font-display text-[10px] font-bold uppercase tracking-wider border-b pb-1",
                      round.side === "grand"
                        ? "text-amber-400/90 border-amber-400/30"
                        : "text-muted-foreground border-border",
                    )}
                  >
                    {round.label}
                  </span>
                  <Select
                    value={format}
                    onValueChange={(v) => onFormatChange(round.id, v as BestOfFormat)}
                  >
                    <SelectTrigger className="h-7 text-[10px] font-tech uppercase tracking-wider bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BO1">BO1</SelectItem>
                      <SelectItem value="BO3">BO3</SelectItem>
                      <SelectItem value="BO5">BO5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {roundMatches.map((match, mi) => {
                  const y = matchTop(mi, roundMatches.length);
                  const matchFormat = roundFormats[round.id] ?? "BO3";
                  const required = winsRequired(matchFormat);
                  const matchDecided = match.confirmed && match.winner !== null;

                  return (
                    <div
                      key={match.id}
                      className={cn(
                        "absolute bg-card border",
                        sideBorder,
                        matchDecided && "ring-1 ring-emerald-400/30",
                      )}
                      style={{ left: `${x}px`, top: `${y}px`, width: CARD_W }}
                    >
                      <div className="flex items-center justify-between border-b border-border/60 px-2 py-1">
                        <span className="text-[10px] font-tech uppercase tracking-wider text-muted-foreground">
                          {match.label}
                        </span>
                        <span className="text-[9px] font-tech text-muted-foreground/70">
                          {matchDecided ? "Final" : matchFormat}
                        </span>
                      </div>

                      <ManagedTeamRow
                        name={match.teamA}
                        score={match.scoreA}
                        required={required}
                        isWinner={!!match.teamA && match.winner === match.teamA}
                        isLoser={
                          matchDecided && !!match.teamA && match.winner !== match.teamA
                        }
                        team={match.teamA ? teamByName.get(match.teamA) : undefined}
                        disabled={!match.teamA || !match.teamB}
                        matchLocked={matchDecided}
                        onIncrement={() =>
                          onScoreChange(match.id, match.scoreA + 1, match.scoreB)
                        }
                        onDecrement={() =>
                          onScoreChange(match.id, Math.max(0, match.scoreA - 1), match.scoreB)
                        }
                        onSelectWinner={() => match.teamA && onPickWinner(match.id, match.teamA)}
                      />
                      <ManagedTeamRow
                        name={match.teamB}
                        score={match.scoreB}
                        required={required}
                        isWinner={!!match.teamB && match.winner === match.teamB}
                        isLoser={
                          matchDecided && !!match.teamB && match.winner !== match.teamB
                        }
                        team={match.teamB ? teamByName.get(match.teamB) : undefined}
                        disabled={!match.teamA || !match.teamB}
                        matchLocked={matchDecided}
                        onIncrement={() =>
                          onScoreChange(match.id, match.scoreA, match.scoreB + 1)
                        }
                        onDecrement={() =>
                          onScoreChange(match.id, match.scoreA, Math.max(0, match.scoreB - 1))
                        }
                        onSelectWinner={() => match.teamB && onPickWinner(match.id, match.teamB)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ManagedTeamRow({
  name,
  score,
  required,
  isWinner,
  isLoser,
  team,
  disabled,
  matchLocked,
  onIncrement,
  onDecrement,
  onSelectWinner,
}: {
  name: string | null;
  score: number;
  required: number;
  isWinner: boolean;
  isLoser?: boolean;
  team?: TournamentTeam;
  disabled: boolean;
  matchLocked: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onSelectWinner: () => void;
}) {
  const isTbd = !name;
  const display = name ?? "TBD";
  const abbr = isTbd ? "?" : (team?.tag ?? name!.slice(0, 2).toUpperCase());
  const controlsDisabled = disabled || isTbd || matchLocked;

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-border/40 px-2 py-1.5 last:border-0",
        isWinner && "bg-emerald-400/10",
        isLoser && "bg-muted/15 opacity-80",
        isTbd && "bg-muted/25",
      )}
    >
      <button
        type="button"
        onClick={onSelectWinner}
        disabled={controlsDisabled}
        className={cn(
          "h-2 w-2 shrink-0 rounded-full border",
          isWinner
            ? "border-emerald-400 bg-emerald-400"
            : isTbd
              ? "border-muted-foreground/25 bg-muted-foreground/15"
              : "border-muted-foreground/40 hover:bg-muted/30",
          controlsDisabled && "opacity-40",
        )}
        title={name && !matchLocked ? `Set ${name} as winner` : undefined}
      />
      <span
        className={cn(
          "w-6 text-center text-[10px] font-tech",
          isTbd ? "text-muted-foreground/50" : "text-muted-foreground",
        )}
      >
        {abbr}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          isTbd ? "font-tech uppercase tracking-wider text-muted-foreground/60" : "font-medium",
        )}
      >
        {display}
      </span>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={controlsDisabled || score <= 0}
          onClick={onDecrement}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-5 text-center text-xs font-bold tabular-nums">
          {isTbd ? "—" : score}
          {!isTbd && (
            <span className="text-[9px] text-muted-foreground">/{required}</span>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={controlsDisabled || score >= required}
          onClick={onIncrement}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
