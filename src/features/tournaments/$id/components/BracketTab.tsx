/**
 * Public read-only bracket viewer.
 *
 * Mirrors the visual layout of the admin ManagedBracketView (canvas-positioned
 * columns, card-per-match, winner highlights) but strips all interactive controls.
 */

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDoubleEliminationFormat, isSwissFormat } from "@/features/tournaments/constants/formats";
import {
  isChampionshipMatch,
  isChampionshipRoundLabel,
  isOpeningPlayInRound,
  partitionDoubleElimRounds,
} from "../../utils/bracket-display";
import {
  BRACKET_CARD_W,
  BRACKET_COL_GAP,
  bracketCanvasSize,
  bracketMatchTop,
} from "../../utils/bracket-layout";
import { sortPublicBracketRounds } from "../../utils/bracket-round-order";
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

  if (isDoubleElim) {
    const { playInRounds, upperRounds, lowerRounds } = partitionDoubleElimRounds(bracket);

    return (
      <div className="flex flex-col gap-10">
        <BracketHeader format={format} />

        {playInRounds.length > 0 && (
          <BracketSection title="Opening — Play-in" rounds={playInRounds} teamTags={teamTags} />
        )}
        <BracketSection title="Upper Bracket" rounds={upperRounds} teamTags={teamTags} />
        {lowerRounds.length > 0 && (
          <BracketSection title="Lower Bracket" rounds={lowerRounds} teamTags={teamTags} />
        )}

        <BracketFooter isDoubleElim hasPlayIn={playInRounds.length > 0} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <BracketHeader format={format} />
      <BracketSection rounds={sortPublicBracketRounds(bracket)} teamTags={teamTags} />
      <BracketFooter hasPlayIn={bracket.some((r) => isOpeningPlayInRound(r.label))} />
    </div>
  );
}

function BracketHeader({ format }: { format: string }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
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
      <p className="text-[10px] font-tech font-semibold uppercase tracking-wider-2 text-muted-foreground/80">
        Play-in winners join the main upper bracket. Lower bracket columns run left to right in
        match order. Grand Final: upper-bracket winner vs lower-bracket winner.
      </p>
    );
  }

  if (hasPlayIn) {
    return (
      <p className="text-[10px] font-tech font-semibold uppercase tracking-wider-2 text-muted-foreground/80">
        Play-in winners fill the remaining main-bracket slots. TBD entries update as matches
        conclude.
      </p>
    );
  }

  return (
    <p className="text-[10px] font-tech font-semibold uppercase tracking-wider-2 text-muted-foreground/80">
      {isDoubleElim
        ? "Winners advance to upper bracket; losers drop to lower bracket."
        : "TBD entries will be filled as the tournament progresses."}
    </p>
  );
}

function BracketSection({
  title,
  rounds,
  teamTags,
}: {
  title?: string;
  rounds: BracketRound[];
  teamTags?: Map<string, string>;
}) {
  if (rounds.length === 0) return null;

  const maxMatches = Math.max(...rounds.map((r) => r.matches.length), 1);
  const { width: totalW, height: canvasHeight } = bracketCanvasSize(rounds.length, maxMatches);

  const isGrand = (label: string) => isChampionshipRoundLabel(label);
  const isLower = (label: string) => /lower/i.test(label) && !isChampionshipRoundLabel(label);

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
          style={{ width: `${totalW}px`, height: `${canvasHeight}px`, minHeight: 300 }}
        >
          {rounds.map((round, colIndex) => {
            const x = colIndex * (BRACKET_CARD_W + BRACKET_COL_GAP) + 20;
            const grand = isGrand(round.label);
            const lower = isLower(round.label);

            const sideBorder = grand
              ? "border-amber-400/55"
              : lower
                ? "border-amber-400/25"
                : "border-border";

            const labelColor = grand
              ? "text-amber-300/90 border-amber-400/35"
              : "text-muted-foreground border-border";

            return (
              <div key={round.id ?? round.label}>
                <div className="absolute top-0" style={{ left: `${x}px`, width: `${BRACKET_CARD_W}px` }}>
                  <span
                    className={cn(
                      "block border-b pb-1 font-display text-[10px] font-bold uppercase tracking-wider",
                      labelColor,
                    )}
                  >
                    {round.label}
                  </span>
                </div>

                {round.matches.map((match, mi) => {
                  const y = bracketMatchTop(mi, round.matches.length, canvasHeight);
                  const isChampionship = isChampionshipMatch(match, round.label);

                  return (
                    <PublicMatchCard
                      key={match.id}
                      match={match}
                      x={x}
                      y={y}
                      sideBorder={sideBorder}
                      isChampionship={isChampionship}
                      teamTags={teamTags}
                    />
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

function PublicMatchCard({
  match,
  x,
  y,
  sideBorder,
  isChampionship = false,
  teamTags,
}: {
  match: BracketMatch;
  x: number;
  y: number;
  sideBorder: string;
  isChampionship?: boolean;
  teamTags?: Map<string, string>;
}) {
  const hasScores = match.scoreA !== undefined && match.scoreB !== undefined;
  const decided = !!match.winner;
  const championCrowned = isChampionship && decided && !!match.winner;
  const matchTitle = match.label ?? match.round;

  return (
    <div
      className={cn(
        "absolute bg-card border",
        isChampionship ? "border-amber-400/55" : sideBorder,
        decided && !isChampionship && "ring-1 ring-emerald-400/30",
        championCrowned && "shadow-[0_0_32px_rgba(251,191,36,0.2)] ring-2 ring-amber-400/45",
      )}
      style={{ left: `${x}px`, top: `${y}px`, width: BRACKET_CARD_W }}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-2 py-1",
          isChampionship ? "border-amber-400/25 bg-amber-400/5" : "border-border/60",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-1 text-[10px] font-tech uppercase tracking-wider",
            isChampionship ? "text-amber-300/90" : "text-muted-foreground",
          )}
        >
          {championCrowned && <Crown className="h-3 w-3" strokeWidth={1.25} />}
          {matchTitle}
        </span>
        {decided && (
          <span
            className={cn(
              "text-[9px] font-tech uppercase tracking-wider",
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
        score={match.scoreA}
        isWinner={decided && match.winner === match.teamA}
        isLoser={decided && !!match.teamA && match.winner !== match.teamA}
        hasScores={hasScores}
        isChampionRow={championCrowned && match.winner === match.teamA}
      />

      <PublicBracketTeamSlot
        name={match.teamB}
        tag={match.teamB ? teamTags?.get(match.teamB) : undefined}
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
        {cols.map((x, ci) => {
          const matchCount = Math.max(1, 4 >> ci);
          return (
            <div key={ci}>
              <div
                className="absolute top-0 h-4 rounded bg-primary/10"
                style={{ left: `${x + 20}px`, width: BRACKET_CARD_W - 20 }}
              />
              {Array.from({ length: matchCount }).map((_, mi) => {
                const y = bracketMatchTop(mi, matchCount, canvasH);
                return (
                  <div
                    key={mi}
                    className="absolute rounded bg-primary/10"
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
