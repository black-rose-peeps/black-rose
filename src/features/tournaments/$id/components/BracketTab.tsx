/**
 * Public read-only bracket viewer.
 *
 * Uses the shared elimination bracket canvas (tree layout, connectors, pan/zoom)
 * with Black Rose styling. Mirrors admin ManagedBracketView structure.
 */

import { useState } from "react";
import { Crown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDoubleEliminationFormat, isSwissFormat } from "@/features/tournaments/constants/formats";
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
  publicToLayoutMatches,
  splitGrandFinalRounds,
} from "@/features/tournaments/utils/bracket-connectors";
import {
  isChampionshipMatch,
  isChampionshipRoundLabel,
  isGrandFinalRound,
  isOpeningPlayInRound,
  partitionDoubleElimRounds,
} from "../../utils/bracket-display";
import {
  BRACKET_CARD_W,
  BRACKET_COL_GAP,
  bracketCanvasSize,
  bracketMatchTop,
} from "../../utils/bracket-layout";
import { hasLowerPlayInPool } from "@/features/tournaments/utils/bracket-slot-hints";
import { sortPublicBracketRounds } from "@/features/tournaments/utils/bracket-round-order";
import { LowerBracketPlayInGuide } from "@/features/tournaments/components/LowerBracketPlayInGuide";
import type { BracketRound, BracketMatch } from "../../types";
import { PublicBracketTeamSlot } from "./PublicBracketTeamSlot";
import { SwissBracketTab } from "./SwissBracketTab";

interface BracketTabProps {
  bracket: BracketRound[];
  format: string;
  isLoading?: boolean;
  teamTags?: Map<string, string>;
  tournamentStatus?: string;
}

export function BracketTab({
  bracket,
  format,
  isLoading = false,
  teamTags,
  tournamentStatus,
}: BracketTabProps) {
  const [viewMode, setViewMode] = useState<DoubleElimViewMode>("full");
  const [splitSide, setSplitSide] = useState<SplitBracketSide>("upper");

  if (isLoading) {
    return <BracketSkeleton />;
  }

  if (bracket.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 border border-border bg-card py-24 text-center">
        <div className="text-4xl text-muted-foreground/20">⬡</div>
        <p className="font-display text-2xl tracking-display text-muted-foreground/50">
          Bracket Not Set
        </p>
        <p className="text-sm text-muted-foreground">
          The bracket will be published once the tournament admin generates it.
        </p>
      </div>
    );
  }

  if (isSwissFormat(format)) {
    return (
      <SwissBracketTab
        bracket={bracket}
        format={format}
        teamTags={teamTags}
        tournamentStatus={tournamentStatus}
      />
    );
  }

  const isDoubleElim = isDoubleEliminationFormat(format);
  const matchById = new Map(
    bracket.flatMap((round) => round.matches.map((match) => [match.id, match] as const)),
  );

  const renderSection = (
    title: string | undefined,
    accent: "primary" | "accent" | "warning",
    rounds: BracketRound[],
  ) => {
    const { bracketRounds, grandRounds } = splitGrandFinalRounds(rounds, (round) =>
      isGrandFinalRound(round.label),
    );
    const columns = toPublicRoundColumns(bracketRounds);
    const sectionLayoutMatches = publicToLayoutMatches(rounds);
    const sectionHasLowerPlayIn = hasLowerPlayInPool(rounds);
    const teamCount = countBracketTeams(bracket);

    return (
      <div className="space-y-4">
        {title && <BracketSectionHeader title={title} accent={accent} />}
        {sectionHasLowerPlayIn && <LowerBracketPlayInGuide teamCount={teamCount} />}
        {columns.length > 0 && (
          <EliminationBracketCanvas
            rounds={columns}
            layoutMatches={sectionLayoutMatches}
            renderMatch={(matchId) => {
              const match = matchById.get(matchId);
              if (!match) return null;
              const round = bracket.find((item) => item.matches.some((entry) => entry.id === matchId));
              return (
                <PublicMatchCard
                  match={match}
                  roundLabel={round?.label}
                  teamTags={teamTags}
                />
              );
            }}
          />
        )}
        {grandRounds.map((round) => {
          const grandMatch = round.matches[0];
          if (!grandMatch) return null;

          return (
            <GrandFinalSection key={round.id ?? round.label}>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="hidden h-20 w-20 shrink-0 place-items-center border border-amber-400/30 bg-amber-400/10 sm:grid">
                  <Trophy className="h-10 w-10 text-amber-300" />
                </div>
                <div className="w-full max-w-sm">
                  <p className="mb-2 font-tech text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                    Championship Match
                  </p>
                  <PublicMatchCard
                    match={grandMatch}
                    roundLabel={round.label}
                    teamTags={teamTags}
                    isGrand
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
    const { playInRounds, upperRounds, lowerRounds } = partitionDoubleElimRounds(bracket);

    return (
      <div className="flex flex-col gap-10">
        <BracketHeader format={format} />
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
            {lowerRounds.length > 0 && renderSection("Lower Bracket", "accent", lowerRounds)}
          </>
        ) : splitSide === "upper" ? (
          renderSection("Upper Bracket", "primary", upperRounds)
        ) : (
          lowerRounds.length > 0 && renderSection("Lower Bracket", "accent", lowerRounds)
        )}
        <BracketFooter isDoubleElim hasPlayIn={playInRounds.length > 0} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <BracketHeader format={format} />
      {renderSection(undefined, "primary", sortPublicBracketRounds(bracket))}
      <BracketFooter hasPlayIn={bracket.some((round) => isOpeningPlayInRound(round.label))} />
    </div>
  );
}

function toPublicRoundColumns(rounds: BracketRound[]): BracketRoundColumn[] {
  return rounds
    .filter((round) => !isGrandFinalRound(round.label))
    .map((round) => ({
      id: round.id ?? round.label,
      label: round.label,
      matchIds: round.matches.map((match) => match.id),
    }));
}

function countBracketTeams(rounds: BracketRound[]): number {
  const names = new Set<string>();
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.teamA) names.add(match.teamA);
      if (match.teamB) names.add(match.teamB);
    }
  }
  return names.size;
}

function BracketHeader({ format }: { format: string }) {
  return (
    <div className="flex items-center gap-3 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
      <span className="h-px w-8 bg-border" />
      {format} Bracket
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function BracketFooter({
  isDoubleElim = false,
  hasPlayIn = false,
}: {
  isDoubleElim?: boolean;
  hasPlayIn?: boolean;
}) {
  if (isDoubleElim && hasPlayIn) {
    return (
      <p className="font-tech text-[10px] font-semibold uppercase tracking-wider-2 text-muted-foreground/80">
        Play-in winners join the main upper bracket. Lower bracket columns run left to right in
        match order. Grand Final: upper-bracket winner vs lower-bracket winner.
      </p>
    );
  }

  if (hasPlayIn) {
    return (
      <p className="font-tech text-[10px] font-semibold uppercase tracking-wider-2 text-muted-foreground/80">
        Play-in winners fill the remaining main-bracket slots. TBD entries update as matches
        conclude.
      </p>
    );
  }

  return (
    <p className="font-tech text-[10px] font-semibold uppercase tracking-wider-2 text-muted-foreground/80">
      {isDoubleElim
        ? "Winners advance to upper bracket; losers drop to lower bracket."
        : "TBD entries will be filled as the tournament progresses."}
    </p>
  );
}

function PublicMatchCard({
  match,
  roundLabel,
  teamTags,
  isGrand = false,
}: {
  match: BracketMatch;
  roundLabel?: string;
  teamTags?: Map<string, string>;
  isGrand?: boolean;
}) {
  const hasScores = match.scoreA !== undefined && match.scoreB !== undefined;
  const decided = !!match.winner;
  const isChampionship = isGrand || isChampionshipMatch(match, roundLabel);
  const championCrowned = isChampionship && decided && !!match.winner;
  const matchTitle = match.label ?? match.round;
  const isLower = roundLabel ? /lower/i.test(roundLabel) && !isChampionshipRoundLabel(roundLabel) : false;

  const sideBorder = isChampionship
    ? "border-amber-400/55"
    : isLower
      ? "border-amber-400/25"
      : "border-border";

  return (
    <div
      className={cn(
        "border bg-card",
        sideBorder,
        decided && !isChampionship && "ring-1 ring-emerald-400/30",
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
          {championCrowned && <Crown className="h-3 w-3" strokeWidth={1.25} />}
          {matchTitle}
        </span>
        {decided && (
          <span
            className={cn(
              "font-tech text-[9px] uppercase tracking-wider",
              championCrowned ? "text-amber-300/80" : "text-emerald-400/70",
            )}
          >
            {championCrowned ? "Champion" : "Final"}
          </span>
        )}
      </div>

      <PublicBracketTeamSlot
        name={match.teamA}
        tag={match.teamA ? teamTags?.get(match.teamA) : undefined}
        placeholder={match.teamAHint}
        score={match.scoreA}
        isWinner={decided && match.winner === match.teamA}
        isLoser={decided && !!match.teamA && match.winner !== match.teamA}
        hasScores={hasScores}
        isChampionRow={championCrowned && match.winner === match.teamA}
      />

      <PublicBracketTeamSlot
        name={match.teamB}
        tag={match.teamB ? teamTags?.get(match.teamB) : undefined}
        placeholder={match.teamBHint}
        score={match.scoreB}
        isWinner={decided && match.winner === match.teamB}
        isLoser={decided && !!match.teamB && match.winner !== match.teamB}
        hasScores={hasScores}
        isChampionRow={championCrowned && match.winner === match.teamB}
      />
    </div>
  );
}

function BracketSkeleton() {
  const cols = [0, BRACKET_CARD_W + BRACKET_COL_GAP, (BRACKET_CARD_W + BRACKET_COL_GAP) * 2];
  const { width: totalW, height: canvasH } = bracketCanvasSize(3, 3);

  return (
    <div className="overflow-auto pb-2">
      <div
        className="relative animate-pulse"
        style={{ width: `${totalW}px`, height: `${canvasH}px`, minHeight: 300 }}
      >
        {cols.map((x, columnIndex) => {
          const matchCount = Math.max(1, 4 >> columnIndex);
          return (
            <div key={columnIndex}>
              <div
                className="absolute top-0 h-4 bg-primary/10"
                style={{ left: `${x + 20}px`, width: BRACKET_CARD_W - 20 }}
              />
              {Array.from({ length: matchCount }).map((_, matchIndex) => {
                const y = bracketMatchTop(matchIndex, matchCount, canvasH);
                return (
                  <div
                    key={matchIndex}
                    className="absolute bg-primary/10"
                    style={{
                      left: `${x + 20}px`,
                      top: `${y}px`,
                      width: BRACKET_CARD_W - 20,
                      height: 120,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
