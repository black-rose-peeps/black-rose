/**
 * Public read-only bracket viewer.
 *
 * Mirrors the visual layout of the admin ManagedBracketView (canvas-positioned
 * columns, card-per-match, winner highlights, scores) but strips all interactive
 * controls — no score editing, no format selectors, no winner buttons.
 *
 * Data shape: BracketRound[] → BracketMatch[] from @/features/tournaments/types.
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
import type { BracketRound, BracketMatch } from "../../types";
import { PublicBracketTeamSlot } from "./PublicBracketTeamSlot";
import { SwissBracketTab } from "./SwissBracketTab";

// ── Layout constants (match admin ManagedBracketView) ──────────────────────

const CARD_W = 220;
const CARD_H = 96;
const MATCH_GAP = 16;
const COL_GAP = 56;
const PAD_V = 24;

// ── Public types ───────────────────────────────────────────────────────────

interface BracketTabProps {
  bracket: BracketRound[];
  format: string;
  isLoading?: boolean;
  teamTags?: Map<string, string>;
  tournamentStatus?: string;
}

// ── Root component ─────────────────────────────────────────────────────────

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

  // Single elimination — one canvas; play-in (if any) is the first column, same as admin
  return (
    <div className="flex flex-col gap-10">
      <BracketHeader format={format} />
      <BracketSection rounds={bracket} teamTags={teamTags} />
      <BracketFooter hasPlayIn={bracket.some((r) => isOpeningPlayInRound(r.label))} />
    </div>
  );
}

// ── Section header / footer ────────────────────────────────────────────────

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
        Play-in winners join the top seeds in the main double-elimination bracket. Winners advance
        up; losers drop to the lower bracket. Grand Final: upper-bracket winner vs lower-bracket
        winner.
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

// ── Canvas section ─────────────────────────────────────────────────────────

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
  const canvasHeight = maxMatches * CARD_H + (maxMatches - 1) * MATCH_GAP + PAD_V * 2 + 36;
  const totalW = rounds.length * (CARD_W + COL_GAP) + 40;

  function matchTop(index: number, count: number): number {
    if (count <= 1) return PAD_V + 36 + (canvasHeight - PAD_V * 2 - 36 - CARD_H) / 2;
    const contentH = canvasHeight - PAD_V * 2 - 36;
    const spacing = (contentH - CARD_H) / (count - 1);
    return PAD_V + 36 + index * spacing;
  }

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
          style={{ width: `${totalW}px`, height: `${canvasHeight}px`, minHeight: 280 }}
        >
          {rounds.map((round, colIndex) => {
            const x = colIndex * (CARD_W + COL_GAP) + 20;
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
              <div key={round.label}>
                {/* Round column header */}
                <div className="absolute top-0" style={{ left: `${x}px`, width: `${CARD_W}px` }}>
                  <span
                    className={cn(
                      "block border-b pb-1 font-display text-[10px] font-bold uppercase tracking-wider",
                      labelColor,
                    )}
                  >
                    {round.label}
                  </span>
                </div>

                {/* Match cards */}
                {round.matches.map((match, mi) => {
                  const y = matchTop(mi, round.matches.length);
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

// ── Read-only match card ───────────────────────────────────────────────────

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

  return (
    <div
      className={cn(
        "absolute bg-card border",
        isChampionship ? "border-amber-400/55" : sideBorder,
        decided && !isChampionship && "ring-1 ring-emerald-400/30",
        championCrowned && "shadow-[0_0_32px_rgba(251,191,36,0.2)] ring-2 ring-amber-400/45",
      )}
      style={{ left: `${x}px`, top: `${y}px`, width: CARD_W }}
    >
      {/* Match label bar */}
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
          {match.round}
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

      {/* Team A */}
      <PublicBracketTeamSlot
        name={match.teamA}
        tag={match.teamA ? teamTags?.get(match.teamA) : undefined}
        score={match.scoreA}
        isWinner={decided && match.winner === match.teamA}
        isLoser={decided && !!match.teamA && match.winner !== match.teamA}
        hasScores={hasScores}
        isChampionRow={championCrowned && match.winner === match.teamA}
      />

      {/* Team B */}
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

// ── Loading skeleton ───────────────────────────────────────────────────────

function BracketSkeleton() {
  // Simulate 4 rounds × 2 cards each at fixed positions
  const cols = [0, CARD_W + COL_GAP, (CARD_W + COL_GAP) * 2, (CARD_W + COL_GAP) * 3];
  const totalW = cols.length * (CARD_W + COL_GAP) + 40;
  const canvasH = 3 * CARD_H + 2 * MATCH_GAP + PAD_V * 2 + 36;

  return (
    <div className="overflow-auto pb-2">
      <div
        className="relative animate-pulse"
        style={{ width: `${totalW}px`, height: `${canvasH}px`, minHeight: 280 }}
      >
        {cols.map((x, ci) => {
          const matchCount = Math.max(1, 4 >> ci); // 4,2,1,1
          return (
            <div key={ci}>
              {/* Round label skeleton */}
              <div
                className="absolute top-0 h-4 rounded bg-primary/10"
                style={{ left: `${x + 20}px`, width: CARD_W - 20 }}
              />
              {Array.from({ length: matchCount }).map((_, mi) => {
                const y = matchTop(mi, matchCount, canvasH);
                return (
                  <div
                    key={mi}
                    className="absolute rounded bg-primary/10"
                    style={{
                      left: `${x + 20}px`,
                      top: `${y}px`,
                      width: CARD_W - 20,
                      height: CARD_H,
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

function matchTop(index: number, count: number, canvasHeight: number): number {
  if (count <= 1) return PAD_V + 36 + (canvasHeight - PAD_V * 2 - 36 - CARD_H) / 2;
  const contentH = canvasHeight - PAD_V * 2 - 36;
  const spacing = (contentH - CARD_H) / (count - 1);
  return PAD_V + 36 + index * spacing;
}
