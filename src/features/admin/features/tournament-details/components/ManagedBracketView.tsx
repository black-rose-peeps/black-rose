import { useState } from "react";
import { Crown, Minus, Plus, Trophy } from "lucide-react";
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
  BracketSectionHeader,
  DoubleElimViewControls,
  EliminationBracketCanvas,
  GrandFinalSection,
  type BracketRoundColumn,
  type DoubleElimViewMode,
  type SplitBracketSide,
} from "@/features/tournaments/components/bracket";
import {
  managedToLayoutMatches,
  splitGrandFinalRounds,
} from "@/features/tournaments/utils/bracket-connectors";
import { sortBracketRoundsByFlow } from "@/features/tournaments/utils/bracket-round-order";
import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "../utils/managed-bracket";
import { winsRequired } from "../utils/managed-bracket";
import { mainBracketSize } from "../utils/bracket-field";
import {
  buildMatchSlotHints,
  hasLowerPlayInPool,
} from "@/features/tournaments/utils/bracket-slot-hints";
import { LowerBracketPlayInGuide } from "@/features/tournaments/components/LowerBracketPlayInGuide";

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
  const [viewMode, setViewMode] = useState<DoubleElimViewMode>("full");
  const [splitSide, setSplitSide] = useState<SplitBracketSide>("upper");

  if (roundMetas.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No bracket rounds to display.
      </p>
    );
  }

  const teamByName = new Map(teams.map((team) => [team.name, team]));
  const championship = findChampionship(matches);
  const layoutMatches = managedToLayoutMatches(matches, roundMetas);
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const slotHints = buildMatchSlotHints(matches);
  const showLowerGuide = isDoubleElim && hasLowerPlayInPool(roundMetas);

  const renderBoSelect = (roundId: string, value: BestOfFormat) => (
    <Select
      value={value}
      onValueChange={(next) => onFormatChange(roundId, next as BestOfFormat)}
    >
      <SelectTrigger
        className="h-7 bg-background/50 font-tech text-[10px] uppercase tracking-wider"
        data-bracket-interactive
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="BO1">BO1</SelectItem>
        <SelectItem value="BO3">BO3</SelectItem>
        <SelectItem value="BO5">BO5</SelectItem>
      </SelectContent>
    </Select>
  );

  const renderSection = (
    title: string | undefined,
    accent: "primary" | "accent" | "warning",
    sectionRounds: BracketRoundMeta[],
  ) => {
    const { bracketRounds, grandRounds } = splitGrandFinalRounds(
      sectionRounds,
      (round) => round.side === "grand",
    );
    const columns = toRoundColumns(bracketRounds);
    const sectionHasLowerPlayIn = hasLowerPlayInPool(sectionRounds);

    return (
      <div className="space-y-4">
        {title && <BracketSectionHeader title={title} accent={accent} />}
        {sectionHasLowerPlayIn && <LowerBracketPlayInGuide teamCount={teams.length} />}
        {columns.length > 0 && (
          <EliminationBracketCanvas
            rounds={columns}
            layoutMatches={layoutMatches}
            renderRoundHeader={
              readOnly ? undefined : (round) => renderBoSelect(round.id, roundFormats[round.id] ?? "BO3")
            }
            renderMatch={(matchId) => {
              const match = matchById.get(matchId);
              if (!match) return null;
              const roundFormat = roundFormats[match.roundId] ?? "BO3";
              return (
                <ManagedMatchCard
                  match={match}
                  format={roundFormat}
                  teamByName={teamByName}
                  readOnly={readOnly}
                  slotHints={slotHints.get(match.id)}
                  onScoreChange={onScoreChange}
                  onPickWinner={onPickWinner}
                />
              );
            }}
          />
        )}
        {grandRounds.map((round) => {
          const grandMatch = round.matchIds
            .map((id) => matchById.get(id))
            .find((match): match is ManagedMatch => !!match);
          if (!grandMatch) return null;

          const roundFormat = roundFormats[round.id] ?? "BO5";
          return (
            <GrandFinalSection key={round.id}>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="hidden h-20 w-20 shrink-0 place-items-center border border-amber-400/30 bg-amber-400/10 sm:grid">
                  <Trophy className="h-10 w-10 text-amber-300" />
                </div>
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-tech text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                      Championship Match
                    </p>
                    {!readOnly && renderBoSelect(round.id, roundFormat)}
                    {readOnly && (
                      <span className="font-tech text-[10px] uppercase tracking-wider text-amber-300/80">
                        {roundFormat}
                      </span>
                    )}
                  </div>
                  <ManagedMatchCard
                    match={grandMatch}
                    format={roundFormat}
                    teamByName={teamByName}
                    readOnly={readOnly}
                    isGrand
                    slotHints={slotHints.get(grandMatch.id)}
                    onScoreChange={onScoreChange}
                    onPickWinner={onPickWinner}
                  />
                </div>
              </div>
            </GrandFinalSection>
          );
        })}
      </div>
    );
  };

  if (isDoubleElim) {
    const playInRounds = sortBracketRoundsByFlow(roundMetas.filter((round) => round.id === "pi-r1"));
    const upperRounds = sortBracketRoundsByFlow(
      roundMetas.filter((round) => round.side === "upper" || round.side === "grand"),
    );
    const lowerRounds = sortBracketRoundsByFlow(roundMetas.filter((round) => round.side === "lower"));

    return (
      <div className="space-y-10">
        {championship && (
          <ChampionBanner
            champion={championship.winner}
            team={teamByName.get(championship.winner)}
            variant={championship.variant}
          />
        )}
        <DoubleElimViewControls
          viewMode={viewMode}
          splitSide={splitSide}
          onViewModeChange={setViewMode}
          onSplitSideChange={setSplitSide}
        />
        {playInRounds.length > 0 && renderSection("Opening — Play-in", "accent", playInRounds)}
        {viewMode === "full" ? (
          <>
            {renderSection("Upper Bracket", "primary", upperRounds)}
            {renderSection("Lower Bracket", "accent", lowerRounds)}
          </>
        ) : splitSide === "upper" ? (
          renderSection("Upper Bracket", "primary", upperRounds)
        ) : (
          renderSection("Lower Bracket", "accent", lowerRounds)
        )}
        <p className="text-xs text-muted-foreground">
          {playInRounds.length > 0
            ? `Play-in winners join the top seeds in a standard ${mainBracketSize(teams.length)}-team double-elimination bracket. `
            : ""}
          {showLowerGuide
            ? "Lower play-in losers enter the lower pool, then crossover with Lower Round 1 before continuing. Dashed lines mark carry-forward paths."
            : "Grand Final: upper-bracket winner vs lower-bracket winner."}
        </p>
      </div>
    );
  }

  const { bracketRounds, grandRounds } = splitGrandFinalRounds(
    sortBracketRoundsByFlow(roundMetas),
    (round) => round.side === "grand",
  );

  return (
    <div className="space-y-4">
      {championship && (
        <ChampionBanner
          champion={championship.winner}
          team={teamByName.get(championship.winner)}
          variant={championship.variant}
        />
      )}
      {renderSection(undefined, "primary", bracketRounds)}
      {grandRounds.map((round) => {
        const grandMatch = round.matchIds
          .map((id) => matchById.get(id))
          .find((match): match is ManagedMatch => !!match);
        if (!grandMatch) return null;

        const roundFormat = roundFormats[round.id] ?? "BO5";
        return (
          <GrandFinalSection key={round.id}>
            <div className="space-y-2">
              {!readOnly && (
                <div className="flex justify-end">{renderBoSelect(round.id, roundFormat)}</div>
              )}
              <ManagedMatchCard
                match={grandMatch}
                format={roundFormat}
                teamByName={teamByName}
                readOnly={readOnly}
                isGrand
                slotHints={slotHints.get(grandMatch.id)}
                onScoreChange={onScoreChange}
                onPickWinner={onPickWinner}
              />
            </div>
          </GrandFinalSection>
        );
      })}
      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          Winners advance automatically. Use +/- or click the dot to set or clear a winner — scores
          stay editable after a match is final.
        </p>
      )}
    </div>
  );
}

function toRoundColumns(roundMetas: BracketRoundMeta[]): BracketRoundColumn[] {
  return roundMetas
    .filter((round) => round.side !== "grand")
    .map((round) => ({
      id: round.id,
      label: round.label,
      matchIds: round.matchIds,
      side: round.side,
    }));
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
    return { winner: final.winner, variant: "final" };
  }

  return null;
}

function ManagedMatchCard({
  match,
  format,
  teamByName,
  readOnly,
  isGrand = false,
  slotHints,
  onScoreChange,
  onPickWinner,
}: {
  match: ManagedMatch;
  format: BestOfFormat;
  teamByName: Map<string, TournamentTeam>;
  readOnly?: boolean;
  isGrand?: boolean;
  slotHints?: { teamA?: string; teamB?: string };
  onScoreChange: (matchId: string, scoreA: number, scoreB: number) => void;
  onPickWinner: (matchId: string, winner: string) => void;
}) {
  const required = winsRequired(format);
  const matchDecided = match.confirmed && match.winner !== null;
  const isChampionship =
    isGrand ||
    match.bracketSide === "grand" ||
    match.roundLabel === "Final" ||
    match.roundLabel === "Playoffs — Final";
  const championCrowned = isChampionship && matchDecided && !!match.winner;
  const sideBorder =
    match.bracketSide === "grand"
      ? "border-amber-400/50"
      : match.bracketSide === "lower"
        ? "border-amber-400/25"
        : "border-border";

  return (
    <div
      data-bracket-interactive
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "border bg-card",
        isChampionship ? "border-amber-400/55" : sideBorder,
        matchDecided && !isChampionship && "ring-1 ring-emerald-400/30",
        championCrowned && "shadow-[0_0_32px_rgba(251,191,36,0.2)] ring-2 ring-amber-400/45",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-2 py-1",
          isChampionship ? "border-amber-400/25 bg-amber-400/5" : "border-border/60",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-1 font-tech text-[10px] uppercase tracking-wider",
            isChampionship ? "text-amber-300/90" : "text-muted-foreground",
          )}
        >
          {championCrowned && <Crown className="h-3 w-3" />}
          {match.label}
        </span>
        <span
          className={cn(
            "font-tech text-[9px] uppercase tracking-wider",
            championCrowned ? "text-amber-300/80" : "text-muted-foreground/70",
          )}
        >
          {championCrowned ? "Champion" : matchDecided ? "Final" : format}
        </span>
      </div>

      <ManagedTeamRow
        name={match.teamA}
        placeholder={slotHints?.teamA}
        score={match.scoreA}
        required={required}
        isWinner={!!match.teamA && match.winner === match.teamA}
        isLoser={matchDecided && !!match.teamA && match.winner !== match.teamA}
        isChampionRow={championCrowned && match.winner === match.teamA}
        team={match.teamA ? teamByName.get(match.teamA) : undefined}
        disabled={readOnly || !match.teamA || !match.teamB}
        onIncrement={() => onScoreChange(match.id, match.scoreA + 1, match.scoreB)}
        onDecrement={() => onScoreChange(match.id, Math.max(0, match.scoreA - 1), match.scoreB)}
        onSelectWinner={() => match.teamA && onPickWinner(match.id, match.teamA)}
      />
      <ManagedTeamRow
        name={match.teamB}
        placeholder={slotHints?.teamB}
        score={match.scoreB}
        required={required}
        isWinner={!!match.teamB && match.winner === match.teamB}
        isLoser={matchDecided && !!match.teamB && match.winner !== match.teamB}
        isChampionRow={championCrowned && match.winner === match.teamB}
        team={match.teamB ? teamByName.get(match.teamB) : undefined}
        disabled={readOnly || !match.teamA || !match.teamB}
        onIncrement={() => onScoreChange(match.id, match.scoreA, match.scoreB + 1)}
        onDecrement={() => onScoreChange(match.id, match.scoreA, Math.max(0, match.scoreB - 1))}
        onSelectWinner={() => match.teamB && onPickWinner(match.id, match.teamB)}
      />
    </div>
  );
}

function ManagedTeamRow({
  name,
  placeholder,
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
  placeholder?: string;
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
  const display = name ?? placeholder ?? "TBD";
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
          "w-6 text-center font-tech text-[10px]",
          isTbd ? "text-muted-foreground/50" : "text-muted-foreground",
        )}
      >
        {abbr}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          isTbd
            ? placeholder
              ? "font-tech text-[10px] uppercase tracking-wider text-muted-foreground/70"
              : "font-tech uppercase tracking-wider text-muted-foreground/60"
            : "font-medium",
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
