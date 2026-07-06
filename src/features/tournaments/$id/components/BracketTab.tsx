/**
 * Public read-only bracket viewer.
 *
 * Uses the shared elimination bracket canvas (tree layout, connectors, pan/zoom)
 * with Black Rose styling. Mirrors admin ManagedBracketView structure.
 */

import { useEffect, useMemo, useState } from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDoubleEliminationFormat, isSwissFormat } from "@/features/tournaments/constants/formats";
import {
  BracketFocusControls,
  BracketSectionHeader,
  DoubleElimViewControls,
  EliminationBracketCanvas,
  EliminationChampionshipStage,
  GrandFinalStage,
  GrandFinalFeederCallout,
  type BracketCanvasBand,
  type BracketFocusSize,
  type BracketRoundColumn,
  type DoubleElimViewMode,
  type SplitBracketSide,
} from "@/features/tournaments/components/bracket";
import {
  applyBracketFocusToDoubleElim,
  getAvailableTopBracketSizes,
  sliceEliminationRoundsForTopN,
} from "@/features/tournaments/utils/bracket-top-slice";
import {
  publicToLayoutMatches,
  splitGrandFinalRounds,
} from "@/features/tournaments/utils/bracket-connectors";
import {
  isChampionshipMatch,
  isChampionshipRoundLabel,
  isGrandFinalRoundRef,
  isLowerBracketRound,
  hasLegacyOpeningPlayIn,
  partitionDoubleElimRounds,
} from "../../utils/bracket-display";
import {
  bracketCapacity,
  isEvenBracketFieldSize,
  openingPlayableMatchCount,
  usesCompressedPreliminaryField,
} from "@/features/admin/features/tournament-details/utils/bracket-field";
import type { GrandFinalMode } from "@/features/admin/features/tournament-details/utils/grand-final";
import type { RoundSchedule } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { getGrandFinalBracketGuide } from "@/features/admin/features/tournament-details/utils/grand-final";
import { getGrandFinalFeederSideFromMatchId } from "@/features/tournaments/utils/bracket-grand-final-feeder";
import {
  BRACKET_CARD_W,
  BRACKET_COL_GAP,
  bracketCanvasSize,
  bracketMatchTop,
} from "../../utils/bracket-layout";
import { sortPublicBracketRounds } from "@/features/tournaments/utils/bracket-round-order";
import { buildByeAdvancementMarkersFromRounds } from "@/features/tournaments/utils/bracket-bye-markers";
import { LowerBracketPlayInGuide } from "@/features/tournaments/components/LowerBracketPlayInGuide";
import { OpeningPlayInGuide } from "@/features/tournaments/components/OpeningPlayInGuide";
import {
  partitionPublicChampionshipRounds,
  publicChampionshipRoundVariant,
  isPublicChampionshipRound,
} from "../../utils/bracket-championship";
import type { BracketRound, BracketMatch } from "../../types";
import { PublicBracketTeamSlot } from "./PublicBracketTeamSlot";
import { SwissBracketTab } from "./SwissBracketTab";

interface BracketTabProps {
  bracket: BracketRound[];
  format: string;
  isLoading?: boolean;
  teamTags?: Map<string, string>;
  teamNames?: string[];
  seedByTeam?: Map<string, number>;
  tournamentStatus?: string;
  grandFinalMode?: GrandFinalMode | null;
  roundSchedules?: Record<string, RoundSchedule> | null;
}

export function BracketTab({
  bracket,
  format,
  isLoading = false,
  teamTags,
  teamNames,
  seedByTeam,
  tournamentStatus,
  grandFinalMode: grandFinalModeProp,
  roundSchedules,
}: BracketTabProps) {
  const [viewMode, setViewMode] = useState<DoubleElimViewMode>("full");
  const [splitSide, setSplitSide] = useState<SplitBracketSide>("upper");
  const [bracketFocus, setBracketFocus] = useState<BracketFocusSize>("all");
  const bracketTeamCount = useMemo(() => countBracketTeams(bracket), [bracket]);
  const availableTopSizes = useMemo(
    () =>
      isEvenBracketFieldSize(bracketTeamCount)
        ? getAvailableTopBracketSizes(bracketTeamCount)
        : [],
    [bracketTeamCount],
  );

  useEffect(() => {
    setBracketFocus((current) => {
      if (current === "all") return current;
      if (availableTopSizes.includes(current)) return current;
      return "all";
    });
  }, [availableTopSizes]);

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
        teamNames={teamNames}
        seedByTeam={seedByTeam}
        tournamentStatus={tournamentStatus}
        roundSchedules={roundSchedules}
      />
    );
  }

  const isDoubleElim = isDoubleEliminationFormat(format);
  const legacyOpeningPlayIn = hasLegacyOpeningPlayIn(bracket);
  const bracketCapacitySize = isEvenBracketFieldSize(bracketTeamCount)
    ? bracketCapacity(bracketTeamCount)
    : 0;
  const hasRoundOneByes = bracketCapacitySize > 0 && bracketCapacitySize > bracketTeamCount;
  const compressedPreliminary = hasRoundOneByes && usesCompressedPreliminaryField(bracketTeamCount);
  const openingMatches =
    compressedPreliminary && isEvenBracketFieldSize(bracketTeamCount)
      ? openingPlayableMatchCount(bracketTeamCount)
      : 0;
  const matchById = new Map(
    bracket.flatMap((round) => round.matches.map((match) => [match.id, match] as const)),
  );

  const renderGrandFinalStage = (grandRounds: BracketRound[]) => {
    if (grandRounds.length === 0 || !isDoubleElim) return null;

    const gfRound =
      grandRounds.find((round) => round.id === "gf") ??
      grandRounds.find(
        (round) => /grand final/i.test(round.label) && !/reset/i.test(round.label),
      ) ??
      grandRounds.find((round) => !/reset/i.test(round.label)) ??
      grandRounds[0];
    const resetRound =
      grandRounds.find((round) => round.id === "gf-reset") ??
      grandRounds.find((round) => /reset/i.test(round.label));
    const primaryMatch = gfRound?.matches[0];
    if (!primaryMatch) return null;

    return (
      <GrandFinalStage
        primaryMatch={{
          id: primaryMatch.id,
          teamA: primaryMatch.teamA ?? null,
          teamB: primaryMatch.teamB ?? null,
          winner: primaryMatch.winner ?? null,
          confirmed: !!primaryMatch.winner,
          label: primaryMatch.label,
        }}
        resetMatch={
          resetRound?.matches[0]
            ? {
                id: resetRound.matches[0].id,
                teamA: resetRound.matches[0].teamA ?? null,
                teamB: resetRound.matches[0].teamB ?? null,
                winner: resetRound.matches[0].winner ?? null,
                confirmed: !!resetRound.matches[0].winner,
                label: resetRound.matches[0].label,
              }
            : null
        }
        grandFinalMode={grandFinalModeProp ?? undefined}
        formatLabel={format}
        primarySchedule={gfRound?.id ? roundSchedules?.[gfRound.id] : undefined}
        resetSchedule={resetRound?.id ? roundSchedules?.[resetRound.id] : undefined}
        renderMatch={(match, variant) => {
          const publicMatch = matchById.get(match.id);
          if (!publicMatch) return null;
          const round = bracket.find((item) =>
            item.matches.some((entry) => entry.id === match.id),
          );
          return (
            <PublicMatchCard
              match={publicMatch}
              roundLabel={round?.label}
              teamTags={teamTags}
              isGrand={variant === "primary"}
            />
          );
        }}
      />
    );
  };

  const renderSectionGuides = (rounds: BracketRound[]) => {
    const sectionHasLowerPlayIn =
      isDoubleElim && legacyOpeningPlayIn && rounds.some((round) => isLowerBracketRound(round.label));
    const sectionHasByeGuide =
      !legacyOpeningPlayIn &&
      hasRoundOneByes &&
      rounds.some((round) => round.id === "se-r0" || round.id === "ub-r1");
    const sectionHasLegacyPlayIn =
      !isDoubleElim && legacyOpeningPlayIn && rounds.some((round) => round.id === "pi-r1");

    return (
      <>
        {sectionHasLowerPlayIn && <LowerBracketPlayInGuide teamCount={bracketTeamCount} />}
        {sectionHasByeGuide && (
          <OpeningPlayInGuide
            teamCount={bracketTeamCount}
            variant="bye"
            bracketCapacity={bracketCapacitySize}
            openingMatchCount={openingMatches > 0 ? openingMatches : undefined}
          />
        )}
        {sectionHasLegacyPlayIn && (
          <OpeningPlayInGuide teamCount={bracketTeamCount} variant="single" />
        )}
      </>
    );
  };

  const renderPublicBracketCanvas = (
    columns: BracketRoundColumn[],
    sectionLayoutMatches: ReturnType<typeof publicToLayoutMatches>,
    sectionByeMarkers: ReturnType<typeof buildByeAdvancementMarkersFromRounds>,
  ) => {
    if (columns.length === 0) return null;

    return (
      <EliminationBracketCanvas
        rounds={columns}
        layoutMatches={sectionLayoutMatches}
        roundSchedules={roundSchedules ?? undefined}
        readOnlySchedules
        renderMatch={(matchId, context) => {
          const match = matchById.get(matchId);
          if (!match) return null;
          const round = bracket.find((item) => item.matches.some((entry) => entry.id === matchId));
          return (
            <PublicMatchCard
              match={match}
              roundLabel={round?.label}
              displayLabel={context?.displayLabel}
              teamTags={teamTags}
              byeMarkers={sectionByeMarkers.get(matchId)}
            />
          );
        }}
      />
    );
  };

  const renderUnifiedDoubleElim = (
    upperSectionRounds: BracketRound[],
    lowerSectionRounds: BracketRound[],
  ) => {
    const { bracketRounds: upperBracketRounds } = splitGrandFinalRounds(
      upperSectionRounds,
      isGrandFinalRoundRef,
    );
    const { bracketRounds: lowerBracketRounds } = splitGrandFinalRounds(
      lowerSectionRounds,
      isGrandFinalRoundRef,
    );
    const upperColumns = toPublicRoundColumns(upperBracketRounds);
    const lowerColumns = toPublicRoundColumns(lowerBracketRounds);
    const allSectionRounds = [...upperSectionRounds, ...lowerSectionRounds];
    const sectionLayoutMatches = publicToLayoutMatches(allSectionRounds);
    const sectionByeMarkers = buildByeAdvancementMarkersFromRounds(allSectionRounds);

    const bands: BracketCanvasBand[] = [
      ...(upperColumns.length > 0
        ? [{ title: "Upper Bracket", accent: "primary" as const, rounds: upperColumns }]
        : []),
      ...(lowerColumns.length > 0
        ? [{ title: "Lower Bracket", accent: "accent" as const, rounds: lowerColumns }]
        : []),
    ];

    return (
      <div className="space-y-4">
        {renderSectionGuides(allSectionRounds)}
        {bands.length > 0 && (
          <EliminationBracketCanvas
            bands={bands}
            layoutMatches={sectionLayoutMatches}
            minHeight={720}
            roundSchedules={roundSchedules ?? undefined}
            readOnlySchedules
            renderMatch={(matchId, context) => {
              const match = matchById.get(matchId);
              if (!match) return null;
              const round = bracket.find((item) =>
                item.matches.some((entry) => entry.id === matchId),
              );
              return (
                <PublicMatchCard
                  match={match}
                  roundLabel={round?.label}
                  displayLabel={context?.displayLabel}
                  teamTags={teamTags}
                  byeMarkers={sectionByeMarkers.get(matchId)}
                />
              );
            }}
          />
        )}
      </div>
    );
  };

  const renderSection = (
    title: string | undefined,
    accent: "primary" | "accent" | "warning",
    rounds: BracketRound[],
    options?: { splitChampionship?: boolean },
  ) => {
    const splitChampionship = options?.splitChampionship ?? !isDoubleElim;
    const { bracketRounds: flowRounds, championshipRounds: stagedChampionship } = splitChampionship
      ? partitionPublicChampionshipRounds(rounds)
      : { bracketRounds: rounds, championshipRounds: [] as BracketRound[] };

    const { bracketRounds, grandRounds } = splitGrandFinalRounds(flowRounds, isGrandFinalRoundRef);
    const columns = toPublicRoundColumns(bracketRounds);
    const sectionLayoutMatches = publicToLayoutMatches(flowRounds);
    const sectionByeMarkers = buildByeAdvancementMarkersFromRounds(flowRounds);
    return (
      <div className="space-y-4">
        {title && <BracketSectionHeader title={title} accent={accent} />}
        {renderSectionGuides(rounds)}
        {renderPublicBracketCanvas(columns, sectionLayoutMatches, sectionByeMarkers)}
        {!isDoubleElim && renderGrandFinalStage(grandRounds)}
        {!isDoubleElim &&
          grandRounds.map((round) => {
            const grandMatch = round.matches[0];
            if (!grandMatch) return null;

            return (
              <div key={round.id ?? round.label} className="mx-auto w-full max-w-md">
                <PublicMatchCard
                  match={grandMatch}
                  roundLabel={round.label}
                  teamTags={teamTags}
                  isGrand={grandMatch.id === "gf-m0"}
                />
              </div>
            );
          })}
        {!isDoubleElim && stagedChampionship.length > 0 && (
          <EliminationChampionshipStage
            rounds={stagedChampionship.map((round) => ({
              roundId: round.id ?? round.label,
              title: round.label,
              subtitle:
                publicChampionshipRoundVariant(round) === "third"
                  ? "Semifinal losers"
                  : "Winner takes the title",
              variant: publicChampionshipRoundVariant(round) === "third" ? "third" : "final",
              match: {
                id: round.matches[0]?.id ?? "",
                teamA: round.matches[0]?.teamA ?? null,
                teamB: round.matches[0]?.teamB ?? null,
                winner: round.matches[0]?.winner ?? null,
                confirmed: !!round.matches[0]?.winner,
                label: round.matches[0]?.label,
              },
            }))}
            formatLabel={format}
            renderMatch={(round) => {
              const publicMatch = matchById.get(round.match.id);
              if (!publicMatch) return null;
              return (
                <PublicMatchCard
                  match={publicMatch}
                  roundLabel={round.title}
                  teamTags={teamTags}
                  isGrand={round.variant !== "third"}
                />
              );
            }}
          />
        )}
      </div>
    );
  };

  if (isDoubleElim) {
    const { upperRounds, lowerRounds } = partitionDoubleElimRounds(bracket);
    const grandRounds = upperRounds.filter(isGrandFinalRoundRef);
    const focusedRounds = applyBracketFocusToDoubleElim(
      upperRounds,
      lowerRounds,
      bracketTeamCount,
      bracketFocus,
    );

    return (
      <div className="flex flex-col gap-10">
        <BracketHeader format={format} />
        <DoubleElimViewControls
          viewMode={viewMode}
          splitSide={splitSide}
          onViewModeChange={setViewMode}
          onSplitSideChange={setSplitSide}
          bracketFocus={bracketFocus}
          availableTopSizes={availableTopSizes}
          onBracketFocusChange={setBracketFocus}
          hasLowerBracket={lowerRounds.length > 0}
        />
        {viewMode === "full" ? (
          renderUnifiedDoubleElim(focusedRounds.upperRounds, focusedRounds.lowerRounds)
        ) : splitSide === "upper" ? (
          renderSection("Upper Bracket", "primary", focusedRounds.upperRounds)
        ) : (
          focusedRounds.lowerRounds.length > 0 &&
          renderSection("Lower Bracket", "accent", focusedRounds.lowerRounds)
        )}
        {renderGrandFinalStage(grandRounds)}
        <BracketFooter
          isDoubleElim
          grandFinalMode={grandFinalModeProp}
          hasLegacyPlayIn={legacyOpeningPlayIn}
          hasRoundOneByes={hasRoundOneByes}
          compressedPreliminary={compressedPreliminary}
          openingMatchCount={openingMatches}
        />
      </div>
    );
  }

  const sorted = sortPublicBracketRounds(bracket);
  const { bracketRounds, championshipRounds } = partitionPublicChampionshipRounds(sorted);
  const focusedBracketRounds =
    bracketFocus === "all"
      ? bracketRounds
      : sliceEliminationRoundsForTopN(bracketRounds, bracketTeamCount, bracketFocus);

  return (
    <div className="flex flex-col gap-10">
      <BracketHeader format={format} />
      <BracketFocusControls
        bracketFocus={bracketFocus}
        availableTopSizes={availableTopSizes}
        onBracketFocusChange={setBracketFocus}
      />
      {renderSection(undefined, "primary", focusedBracketRounds, { splitChampionship: false })}
      {championshipRounds.length > 0 && (
        <EliminationChampionshipStage
          rounds={championshipRounds.map((round) => ({
            roundId: round.id ?? round.label,
            title: round.label,
            subtitle:
              publicChampionshipRoundVariant(round) === "third"
                ? "Semifinal losers"
                : "Winner takes the title",
            variant: publicChampionshipRoundVariant(round) === "third" ? "third" : "final",
            match: {
              id: round.matches[0]?.id ?? "",
              teamA: round.matches[0]?.teamA ?? null,
              teamB: round.matches[0]?.teamB ?? null,
              winner: round.matches[0]?.winner ?? null,
              confirmed: !!round.matches[0]?.winner,
              label: round.matches[0]?.label,
            },
          }))}
          formatLabel={format}
          renderMatch={(round) => {
            const publicMatch = matchById.get(round.match.id);
            if (!publicMatch) return null;
            return (
              <PublicMatchCard
                match={publicMatch}
                roundLabel={round.title}
                teamTags={teamTags}
                isGrand={round.variant !== "third"}
              />
            );
          }}
        />
      )}
      <BracketFooter
        hasLegacyPlayIn={legacyOpeningPlayIn}
        hasRoundOneByes={hasRoundOneByes}
        compressedPreliminary={compressedPreliminary}
        openingMatchCount={openingMatches}
      />
    </div>
  );
}

function toPublicRoundColumns(rounds: BracketRound[]): BracketRoundColumn[] {
  return rounds
    .filter((round) => !isGrandFinalRoundRef(round) && !isPublicChampionshipRound(round))
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
  grandFinalMode,
  hasLegacyPlayIn = false,
  hasRoundOneByes = false,
  compressedPreliminary = false,
  openingMatchCount = 0,
}: {
  isDoubleElim?: boolean;
  grandFinalMode?: GrandFinalMode | null;
  hasLegacyPlayIn?: boolean;
  hasRoundOneByes?: boolean;
  compressedPreliminary?: boolean;
  openingMatchCount?: number;
}) {
  if (isDoubleElim && hasLegacyPlayIn) {
    return (
      <p className="font-tech text-[10px] font-semibold uppercase tracking-wider-2 text-muted-foreground/80">
        Play-in winners join the main upper bracket. Lower bracket columns run left to right in
        match order. {getGrandFinalBracketGuide(grandFinalMode)}
      </p>
    );
  }

  if (hasLegacyPlayIn) {
    return (
      <p className="font-tech text-[10px] font-semibold uppercase tracking-wider-2 text-muted-foreground/80">
        Play-in winners fill the remaining main-bracket slots. TBD entries update as matches
        conclude.
      </p>
    );
  }

  if (hasRoundOneByes) {
    return (
      <p className="font-tech text-[10px] font-semibold uppercase tracking-wider-2 text-muted-foreground/80">
        {compressedPreliminary
          ? `Top seeds received round-one byes on a ${isDoubleElim ? "double" : "single"}-elimination tree. ${openingMatchCount} opening matches decide the remaining upper-bracket slots.`
          : `Top seeds received round-one byes on a ${isDoubleElim ? "double" : "single"}-elimination tree. Bye slots auto-advance; remaining rounds follow standard bracket progression.`}
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
  displayLabel,
  byeMarkers,
  isGrand = false,
}: {
  match: BracketMatch;
  roundLabel?: string;
  teamTags?: Map<string, string>;
  displayLabel?: string;
  byeMarkers?: { teamA?: boolean; teamB?: boolean };
  isGrand?: boolean;
}) {
  const hasScores = match.scoreA !== undefined && match.scoreB !== undefined;
  const decided = !!match.winner;
  const isChampionship = isGrand || isChampionshipMatch(match, roundLabel);
  const championCrowned = isChampionship && decided && !!match.winner;
  const matchTitle = displayLabel ?? match.label ?? match.round;
  const isLower = roundLabel
    ? /lower/i.test(roundLabel) && !isChampionshipRoundLabel(roundLabel)
    : false;

  const sideBorder = isChampionship
    ? "border-amber-400/55"
    : isLower
      ? "border-amber-400/35"
      : "border-border/70";
  const grandFinalFeederSide = getGrandFinalFeederSideFromMatchId(match.id);
  const showGrandFinalFeeder = !!grandFinalFeederSide && decided && !!match.winner;

  return (
    <div
      className={cn(
        "border bg-muted shadow-[0_1px_0_rgba(255,255,255,0.05)]",
        sideBorder,
        decided && !isChampionship && "ring-1 ring-emerald-400/30",
        championCrowned && "shadow-[0_0_32px_rgba(251,191,36,0.2)] ring-2 ring-amber-400/45",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-2 py-1",
          isChampionship ? "border-amber-400/30 bg-amber-400/8" : "border-border/70 bg-secondary/40",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-1 font-tech text-[10px] uppercase tracking-wider",
            isChampionship ? "text-amber-200" : "text-foreground/75",
          )}
        >
          {championCrowned && <Crown className="h-3 w-3" strokeWidth={1.25} />}
          {matchTitle}
        </span>
        {decided && (
          <span
            className={cn(
              "font-tech text-[9px] uppercase tracking-wider",
              championCrowned
                ? "text-amber-300/80"
                : grandFinalFeederSide
                  ? "text-amber-300/80"
                  : "text-emerald-400/70",
            )}
          >
            {championCrowned ? "Champion" : showGrandFinalFeeder ? "→ Grand Finals" : "Final"}
          </span>
        )}
      </div>

      <PublicBracketTeamSlot
        name={match.teamA}
        tag={match.teamA ? teamTags?.get(match.teamA) : undefined}
        placeholder={match.teamAHint}
        isProtectedSeed={byeMarkers?.teamA}
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
        isProtectedSeed={byeMarkers?.teamB}
        score={match.scoreB}
        isWinner={decided && match.winner === match.teamB}
        isLoser={decided && !!match.teamB && match.winner !== match.teamB}
        hasScores={hasScores}
        isChampionRow={championCrowned && match.winner === match.teamB}
      />

      {showGrandFinalFeeder && grandFinalFeederSide && (
        <GrandFinalFeederCallout side={grandFinalFeederSide} />
      )}
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
