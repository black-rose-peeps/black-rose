import { Crown, Minus, Plus } from "lucide-react";
import { ChampionBanner } from "./ChampionBanner";
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
import {
  BRACKET_CARD_W,
  BRACKET_COL_GAP,
  bracketCanvasSize,
  bracketMatchTop,
} from "@/features/tournaments/utils/bracket-layout";
import { sortBracketRoundsByFlow } from "@/features/tournaments/utils/bracket-round-order";
import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "../utils/managed-bracket";
import { winsRequired } from "../utils/managed-bracket";
import { mainBracketSize } from "../utils/bracket-field";

interface ManagedBracketViewProps {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
  roundFormats: Record<string, BestOfFormat>;
  teams: TournamentTeam[];
  isDoubleElim: boolean;
  readOnly?: boolean;
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
  readOnly = false,
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
  const championship = findChampionship(matches);

  if (isDoubleElim) {
    const playInRounds = sortBracketRoundsByFlow(roundMetas.filter((r) => r.id === "pi-r1"));
    const upperRounds = sortBracketRoundsByFlow(
      roundMetas.filter((r) => r.side === "upper" || r.side === "grand"),
    );
    const lowerRounds = sortBracketRoundsByFlow(roundMetas.filter((r) => r.side === "lower"));

    return (
      <div className="space-y-8">
        {championship && (
          <ChampionBanner
            champion={championship.winner}
            team={teamByName.get(championship.winner)}
            variant={championship.variant}
          />
        )}
        {playInRounds.length > 0 && (
          <BracketSection
            title="Opening — Play-in"
            roundMetas={playInRounds}
            matches={matches}
            roundFormats={roundFormats}
            teamByName={teamByName}
            readOnly={readOnly}
            onFormatChange={onFormatChange}
            onScoreChange={onScoreChange}
            onPickWinner={onPickWinner}
          />
        )}
        <BracketSection
          title="Upper Bracket"
          roundMetas={upperRounds}
          matches={matches}
          roundFormats={roundFormats}
          teamByName={teamByName}
          readOnly={readOnly}
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
          readOnly={readOnly}
          onFormatChange={onFormatChange}
          onScoreChange={onScoreChange}
          onPickWinner={onPickWinner}
        />
        <p className="text-xs text-muted-foreground">
          {playInRounds.length > 0
            ? `Play-in winners join the top seeds in a standard ${mainBracketSize(teams.length)}-team double-elimination bracket. `
            : ""}
          Grand Final: upper-bracket winner vs lower-bracket winner.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {championship && (
        <ChampionBanner
          champion={championship.winner}
          team={teamByName.get(championship.winner)}
          variant={championship.variant}
        />
      )}
      <BracketSection
        roundMetas={sortBracketRoundsByFlow(roundMetas)}
        matches={matches}
        roundFormats={roundFormats}
        teamByName={teamByName}
        readOnly={readOnly}
        onFormatChange={onFormatChange}
        onScoreChange={onScoreChange}
        onPickWinner={onPickWinner}
      />
      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          Winners advance automatically. Use +/- or click the dot to set or clear a winner — scores
          stay editable after a match is final.
        </p>
      )}
    </div>
  );
}

function BracketSection({
  title,
  roundMetas,
  matches,
  roundFormats,
  teamByName,
  readOnly,
  onFormatChange,
  onScoreChange,
  onPickWinner,
}: {
  title?: string;
  roundMetas: BracketRoundMeta[];
  matches: ManagedMatch[];
  roundFormats: Record<string, BestOfFormat>;
  teamByName: Map<string, TournamentTeam>;
  readOnly?: boolean;
  onFormatChange: (roundId: string, format: BestOfFormat) => void;
  onScoreChange: (matchId: string, scoreA: number, scoreB: number) => void;
  onPickWinner: (matchId: string, winner: string) => void;
}) {
  if (roundMetas.length === 0) return null;

  const maxMatches = Math.max(...roundMetas.map((r) => r.matchIds.length), 1);
  const { width: totalW, height: canvasHeight } = bracketCanvasSize(roundMetas.length, maxMatches);

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
            const x = colIndex * (BRACKET_CARD_W + BRACKET_COL_GAP) + 20;
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
                  style={{ left: `${x}px`, width: `${BRACKET_CARD_W}px` }}
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
                    disabled={readOnly}
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
                  const y = bracketMatchTop(mi, roundMatches.length, canvasHeight);
                  const matchFormat = roundFormats[round.id] ?? "BO3";
                  const required = winsRequired(matchFormat);
                  const matchDecided = match.confirmed && match.winner !== null;
                  const isChampionship =
                    match.bracketSide === "grand" ||
                    match.roundLabel === "Final" ||
                    match.roundLabel === "Playoffs — Final";
                  const championCrowned = isChampionship && matchDecided && !!match.winner;

                  return (
                    <div
                      key={match.id}
                      className={cn(
                        "absolute bg-card border",
                        isChampionship ? "border-amber-400/55" : sideBorder,
                        matchDecided && !isChampionship && "ring-1 ring-emerald-400/30",
                        championCrowned &&
                          "shadow-[0_0_32px_rgba(251,191,36,0.2)] ring-2 ring-amber-400/45",
                      )}
                      style={{ left: `${x}px`, top: `${y}px`, width: BRACKET_CARD_W }}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-between border-b px-2 py-1",
                          isChampionship
                            ? "border-amber-400/25 bg-amber-400/5"
                            : "border-border/60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[10px] font-tech uppercase tracking-wider",
                            isChampionship ? "text-amber-300/90" : "text-muted-foreground",
                          )}
                        >
                          {championCrowned && <Crown className="h-3 w-3" />}
                          {match.label}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-tech uppercase tracking-wider",
                            championCrowned ? "text-amber-300/80" : "text-muted-foreground/70",
                          )}
                        >
                          {championCrowned ? "Champion" : matchDecided ? "Final" : matchFormat}
                        </span>
                      </div>

                      <ManagedTeamRow
                        name={match.teamA}
                        score={match.scoreA}
                        required={required}
                        isWinner={!!match.teamA && match.winner === match.teamA}
                        isLoser={matchDecided && !!match.teamA && match.winner !== match.teamA}
                        isChampionRow={championCrowned && match.winner === match.teamA}
                        team={match.teamA ? teamByName.get(match.teamA) : undefined}
                        disabled={readOnly || !match.teamA || !match.teamB}
                        onIncrement={() => onScoreChange(match.id, match.scoreA + 1, match.scoreB)}
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
                        isLoser={matchDecided && !!match.teamB && match.winner !== match.teamB}
                        isChampionRow={championCrowned && match.winner === match.teamB}
                        team={match.teamB ? teamByName.get(match.teamB) : undefined}
                        disabled={readOnly || !match.teamA || !match.teamB}
                        onIncrement={() => onScoreChange(match.id, match.scoreA, match.scoreB + 1)}
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

function findChampionship(
  matches: ManagedMatch[],
): { winner: string; variant: "grand" | "final" } | null {
  const grand = matches.find(
    (match) => match.bracketSide === "grand" && match.confirmed && match.winner,
  );
  if (grand?.winner) return { winner: grand.winner, variant: "grand" };

  const final = matches.find(
    (match) =>
      (match.roundLabel === "Final" || match.roundLabel === "Playoffs — Final") &&
      match.confirmed &&
      match.winner,
  );
  if (final?.winner) {
    return {
      winner: final.winner,
      variant: final.roundLabel === "Playoffs — Final" ? "final" : "final",
    };
  }

  return null;
}

function ManagedTeamRow({
  name,
  score,
  required,
  isWinner,
  isLoser,
  isChampionRow,
  team,
  disabled,
  onIncrement,
  onDecrement,
  onSelectWinner,
}: {
  name: string | null;
  score: number;
  required: number;
  isWinner: boolean;
  isLoser?: boolean;
  isChampionRow?: boolean;
  team?: TournamentTeam;
  disabled: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onSelectWinner: () => void;
}) {
  const isTbd = !name;
  const display = name ?? "TBD";
  const abbr = isTbd ? "?" : (team?.tag ?? name!.slice(0, 2).toUpperCase());
  const controlsDisabled = disabled || isTbd;

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-border/40 px-2 py-1.5 last:border-0",
        isChampionRow && "bg-amber-400/15",
        isWinner && !isChampionRow && "bg-emerald-400/10",
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
          isChampionRow
            ? "border-amber-300 bg-amber-300"
            : isWinner
              ? "border-emerald-400 bg-emerald-400"
              : isTbd
                ? "border-muted-foreground/25 bg-muted-foreground/15"
                : "border-muted-foreground/40 hover:bg-muted/30",
          controlsDisabled && "opacity-40",
        )}
        title={name ? (isWinner ? `Clear winner (${name})` : `Set ${name} as winner`) : undefined}
        aria-label={
          name ? (isWinner ? `Clear winner (${name})` : `Set ${name} as winner`) : undefined
        }
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
          aria-label={name ? `Decrease score for ${name}` : "Decrease score"}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-5 text-center text-xs font-bold tabular-nums">
          {isTbd ? "—" : score}
          {!isTbd && <span className="text-[9px] text-muted-foreground">/{required}</span>}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={controlsDisabled || score >= required}
          onClick={onIncrement}
          aria-label={name ? `Increase score for ${name}` : "Increase score"}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
