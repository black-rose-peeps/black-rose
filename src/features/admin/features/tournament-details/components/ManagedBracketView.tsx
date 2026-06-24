import { useMemo, useState, useEffect } from "react";
import { Crown, Minus, Plus, Shield } from "lucide-react";
import { ChampionBanner } from "./ChampionBanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";
import {
  BracketFormatToolbar,
  BracketSectionHeader,
  DoubleElimViewControls,
  EliminationBracketCanvas,
  EliminationChampionshipStage,
  GrandFinalStage,
  type BracketCanvasBand,
  type BracketRoundColumn,
  type ChampionshipStageRound,
  BracketFocusControls,
  type BracketFocusSize,
  type DoubleElimViewMode,
  type SplitBracketSide,
} from "@/features/tournaments/components/bracket";
import {
  applyBracketFocusToDoubleElim,
  getAvailableTopBracketSizes,
  sliceEliminationRoundsForTopN,
} from "@/features/tournaments/utils/bracket-top-slice";
import {
  managedToLayoutMatches,
  splitGrandFinalRounds,
} from "@/features/tournaments/utils/bracket-connectors";
import {
  championshipRoundVariant,
  partitionChampionshipRounds,
} from "@/features/tournaments/utils/bracket-championship";
import { sortBracketRoundsByFlow } from "@/features/tournaments/utils/bracket-round-order";
import type { BestOfFormat, BracketRoundMeta, ManagedMatch } from "../utils/managed-bracket";
import { winsRequired } from "../utils/managed-bracket";
import {
  bracketCapacity,
  byeCount,
  isEvenBracketFieldSize,
  openingPlayableMatchCount,
  usesCompressedPreliminaryField,
} from "../utils/bracket-field";
import { buildMatchSlotHints } from "@/features/tournaments/utils/bracket-slot-hints";
import { buildByeAdvancementMarkers } from "@/features/tournaments/utils/bracket-bye-markers";
import { LowerBracketPlayInGuide } from "@/features/tournaments/components/LowerBracketPlayInGuide";
import { OpeningPlayInGuide } from "@/features/tournaments/components/OpeningPlayInGuide";
import { getLockedFormatRoundIds } from "./RoundFormatPanel";
import {
  resolveGrandFinalChampion,
  type GrandFinalMode,
} from "@/features/admin/features/tournament-details/utils/grand-final";

interface ManagedBracketViewProps {
  matches: ManagedMatch[];
  roundMetas: BracketRoundMeta[];
  roundFormats: Record<string, BestOfFormat>;
  teams: TournamentTeam[];
  isDoubleElim: boolean;
  grandFinalMode?: GrandFinalMode;
  readOnly?: boolean;
  onFormatChange: (roundId: string, format: BestOfFormat) => void;
  onApplyRecommendedFormats?: () => void;
  onScoreChange: (matchId: string, scoreA: number, scoreB: number) => void;
  onPickWinner: (matchId: string, winner: string) => void;
}

export function ManagedBracketView({
  matches,
  roundMetas,
  roundFormats,
  teams,
  isDoubleElim,
  grandFinalMode,
  readOnly = false,
  onFormatChange,
  onApplyRecommendedFormats,
  onScoreChange,
  onPickWinner,
}: ManagedBracketViewProps) {
  const [viewMode, setViewMode] = useState<DoubleElimViewMode>("full");
  const [splitSide, setSplitSide] = useState<SplitBracketSide>("upper");
  const [bracketFocus, setBracketFocus] = useState<BracketFocusSize>("all");
  const availableTopSizes = useMemo(
    () => getAvailableTopBracketSizes(teams.length),
    [teams.length],
  );

  useEffect(() => {
    setBracketFocus((current) => {
      if (current === "all") return current;
      if (availableTopSizes.includes(current)) return current;
      return "all";
    });
  }, [availableTopSizes]);

  if (roundMetas.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No bracket rounds to display.
      </p>
    );
  }

  const teamByName = new Map(teams.map((team) => [team.name, team]));
  const championship = findChampionship(matches, grandFinalMode);
  const layoutMatches = managedToLayoutMatches(matches, roundMetas);
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const slotHints = buildMatchSlotHints(matches, roundMetas);
  const byeMarkers = buildByeAdvancementMarkers(matches, roundMetas);
  const hasValidFieldSize = isEvenBracketFieldSize(teams.length);
  const elimByes = hasValidFieldSize ? byeCount(teams.length) : 0;
  const elimCapacity = hasValidFieldSize ? bracketCapacity(teams.length) : teams.length;
  const showLowerGuide = isDoubleElim && roundMetas.some((round) => round.id === "pi-r1");
  const showByeGuide = elimByes > 0;
  const lockedFormatRoundIds = getLockedFormatRoundIds(matches);

  const renderChampionshipStage = (
    championshipRounds: BracketRoundMeta[],
    options?: { sectionTitle?: string },
  ) => {
    if (championshipRounds.length === 0) return null;

    const stageRounds: ChampionshipStageRound[] = championshipRounds.flatMap((round) => {
      const match = round.matchIds
        .map((id) => matchById.get(id))
        .find((entry): entry is ManagedMatch => !!entry);
      if (!match) return [];

      const variant = championshipRoundVariant(round);
      return [
        {
          roundId: round.id,
          title: round.label,
          subtitle:
            variant === "third"
              ? "Semifinal losers"
              : round.side === "playoff"
                ? "Swiss playoff champion"
                : "Winner takes the title",
          variant: variant === "third" ? ("third" as const) : ("final" as const),
          match,
        },
      ];
    });

    if (stageRounds.length === 0) return null;

    const finalRound = stageRounds.find((round) => round.variant === "final") ?? stageRounds[0];
    const finalFormat = roundFormats[finalRound.roundId] ?? "BO5";
    const thirdRound = stageRounds.find((round) => round.variant === "third");
    const thirdFormat = thirdRound ? (roundFormats[thirdRound.roundId] ?? "BO3") : "BO3";

    return (
      <EliminationChampionshipStage
        rounds={stageRounds}
        formatLabel={readOnly ? finalFormat : undefined}
        formatControl={
          !readOnly ? (
            <div className="flex flex-wrap gap-2">
              {!lockedFormatRoundIds.has(finalRound.roundId) &&
                renderGrandFormatSelect(finalRound.roundId, finalFormat)}
              {thirdRound &&
                !lockedFormatRoundIds.has(thirdRound.roundId) &&
                renderGrandFormatSelect(thirdRound.roundId, thirdFormat)}
            </div>
          ) : undefined
        }
        renderMatch={(round) => {
          const managed = matchById.get(round.match.id);
          if (!managed) return null;
          const roundFormat = round.variant === "third" ? thirdFormat : finalFormat;
          return (
            <ManagedMatchCard
              match={managed}
              format={roundFormat}
              teamByName={teamByName}
              readOnly={readOnly}
              isGrand
              slotHints={slotHints.get(managed.id)}
              byeMarkers={byeMarkers.get(managed.id)}
              onScoreChange={onScoreChange}
              onPickWinner={onPickWinner}
            />
          );
        }}
      />
    );
  };

  const renderGrandFormatSelect = (roundId: string, value: BestOfFormat) => {
    const selectId = `bracket-grand-format-${roundId}`;
    return (
      <select
        id={selectId}
        value={value}
        disabled={readOnly}
        onChange={(event) => onFormatChange(roundId, event.target.value as BestOfFormat)}
        className="h-7 min-w-[4.5rem] cursor-pointer rounded-md border border-border bg-background px-2 font-tech text-[10px] uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="BO1">BO1</option>
        <option value="BO3">BO3</option>
        <option value="BO5">BO5</option>
      </select>
    );
  };

  const renderGrandFinalStage = (grandRounds: BracketRoundMeta[]) => {
    if (grandRounds.length === 0 || !isDoubleElim) return null;

    const gfRound = grandRounds.find((round) => round.id === "gf");
    const resetRound = grandRounds.find((round) => round.id === "gf-reset");
    const primaryMatch = gfRound?.matchIds
      .map((id) => matchById.get(id))
      .find((match): match is ManagedMatch => !!match);
    if (!primaryMatch) return null;

    const resetMatch = resetRound?.matchIds
      .map((id) => matchById.get(id))
      .find((match): match is ManagedMatch => !!match);
    const primaryFormat = roundFormats.gf ?? "BO5";
    const resetFormat = roundFormats["gf-reset"] ?? primaryFormat;

    return (
      <GrandFinalStage
        primaryMatch={primaryMatch}
        resetMatch={resetMatch}
        grandFinalMode={grandFinalMode}
        formatLabel={readOnly ? primaryFormat : undefined}
        formatControl={
          !readOnly ? (
            <div className="flex flex-wrap gap-2">
              {!lockedFormatRoundIds.has("gf") && renderGrandFormatSelect("gf", primaryFormat)}
              {resetMatch &&
                !lockedFormatRoundIds.has("gf-reset") &&
                renderGrandFormatSelect("gf-reset", resetFormat)}
            </div>
          ) : undefined
        }
        renderMatch={(match, variant) => {
          const roundFormat = variant === "reset" ? resetFormat : primaryFormat;
          const managed = matchById.get(match.id);
          if (!managed) return null;
          return (
            <ManagedMatchCard
              match={managed}
              format={roundFormat}
              teamByName={teamByName}
              readOnly={readOnly}
              isGrand
              slotHints={slotHints.get(managed.id)}
              byeMarkers={byeMarkers.get(managed.id)}
              onScoreChange={onScoreChange}
              onPickWinner={onPickWinner}
            />
          );
        }}
      />
    );
  };

  const renderSectionGuides = (sectionRounds: BracketRoundMeta[]) => {
    const sectionHasLowerPlayIn =
      showLowerGuide && sectionRounds.some((round) => round.side === "lower");
    const sectionHasByeGuide =
      showByeGuide &&
      sectionRounds.some(
        (round) => round.id === "pi-r1" || round.id === "ub-r1" || round.id === "se-r0",
      );
    const sectionHasLegacyPlayIn =
      sectionRounds.some((round) => round.id === "pi-r1") &&
      roundMetas.some((round) => round.id === "pi-r1");

    return (
      <>
        {sectionHasLegacyPlayIn && sectionHasLowerPlayIn && (
          <LowerBracketPlayInGuide teamCount={teams.length} />
        )}
        {sectionHasByeGuide && !sectionHasLegacyPlayIn && (
          <OpeningPlayInGuide
            teamCount={teams.length}
            variant="bye"
            bracketCapacity={elimCapacity}
            openingMatchCount={
              usesCompressedPreliminaryField(teams.length)
                ? openingPlayableMatchCount(teams.length)
                : undefined
            }
          />
        )}
      </>
    );
  };

  const renderBracketCanvas = (columns: BracketRoundColumn[]) => {
    if (columns.length === 0) return null;

    return (
      <EliminationBracketCanvas
        rounds={columns}
        layoutMatches={layoutMatches}
        roundFormats={roundFormats}
        lockedFormatRoundIds={lockedFormatRoundIds}
        readOnlyFormats={readOnly}
        onFormatChange={onFormatChange}
        renderMatch={(matchId, context) => {
          const match = matchById.get(matchId);
          if (!match) return null;
          const roundFormat = roundFormats[match.roundId] ?? "BO3";
          return (
            <ManagedMatchCard
              key={`${match.id}-${roundFormat}`}
              match={match}
              format={roundFormat}
              displayLabel={context?.displayLabel}
              teamByName={teamByName}
              readOnly={readOnly}
              slotHints={slotHints.get(match.id)}
              byeMarkers={byeMarkers.get(match.id)}
              onScoreChange={onScoreChange}
              onPickWinner={onPickWinner}
            />
          );
        }}
      />
    );
  };

  const renderUnifiedDoubleElim = (
    upperSectionRounds: BracketRoundMeta[],
    lowerSectionRounds: BracketRoundMeta[],
  ) => {
    const { bracketRounds: upperBracketRounds, grandRounds } = splitGrandFinalRounds(
      upperSectionRounds,
      (round) => round.side === "grand",
    );
    const { bracketRounds: lowerBracketRounds } = splitGrandFinalRounds(
      lowerSectionRounds,
      (round) => round.side === "grand",
    );
    const upperColumns = toRoundColumns(upperBracketRounds);
    const lowerColumns = toRoundColumns(lowerBracketRounds);
    const allSectionRounds = [...upperSectionRounds, ...lowerSectionRounds];

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
            layoutMatches={layoutMatches}
            roundFormats={roundFormats}
            lockedFormatRoundIds={lockedFormatRoundIds}
            readOnlyFormats={readOnly}
            onFormatChange={onFormatChange}
            minHeight={720}
            renderMatch={(matchId, context) => {
              const match = matchById.get(matchId);
              if (!match) return null;
              const roundFormat = roundFormats[match.roundId] ?? "BO3";
              return (
                <ManagedMatchCard
                  key={`${match.id}-${roundFormat}`}
                  match={match}
                  format={roundFormat}
                  displayLabel={context?.displayLabel}
                  teamByName={teamByName}
                  readOnly={readOnly}
                  slotHints={slotHints.get(match.id)}
                  byeMarkers={byeMarkers.get(match.id)}
                  onScoreChange={onScoreChange}
                  onPickWinner={onPickWinner}
                />
              );
            }}
          />
        )}
        {renderGrandFinalStage(grandRounds)}
      </div>
    );
  };

  const renderSection = (
    title: string | undefined,
    accent: "primary" | "accent" | "warning",
    sectionRounds: BracketRoundMeta[],
    options?: { splitChampionship?: boolean },
  ) => {
    const splitChampionship = options?.splitChampionship ?? !isDoubleElim;
    const { bracketRounds: flowRounds, championshipRounds: stagedChampionship } = splitChampionship
      ? partitionChampionshipRounds(sectionRounds)
      : { bracketRounds: sectionRounds, championshipRounds: [] as BracketRoundMeta[] };

    const { bracketRounds, grandRounds } = splitGrandFinalRounds(
      flowRounds,
      (round) => round.side === "grand",
    );
    const columns = toRoundColumns(bracketRounds);
    return (
      <div className="space-y-4">
        {title && <BracketSectionHeader title={title} accent={accent} />}
        {renderSectionGuides(sectionRounds)}
        {renderBracketCanvas(columns)}
        {renderGrandFinalStage(grandRounds)}
        {!isDoubleElim && renderChampionshipStage(stagedChampionship)}
      </div>
    );
  };

  if (isDoubleElim) {
    const upperRounds = sortBracketRoundsByFlow(
      roundMetas.filter((round) => round.side === "upper" || round.side === "grand"),
    );
    const lowerRounds = sortBracketRoundsByFlow(
      roundMetas.filter((round) => round.side === "lower"),
    );
    const focusedRounds = applyBracketFocusToDoubleElim(
      upperRounds,
      lowerRounds,
      teams.length,
      bracketFocus,
    );

    return (
      <div className="space-y-10">
        {championship && (
          <ChampionBanner
            champion={championship.winner}
            team={teamByName.get(championship.winner)}
            variant={championship.variant}
          />
        )}
        {!readOnly && onApplyRecommendedFormats && (
          <BracketFormatToolbar onApplyRecommended={onApplyRecommendedFormats} />
        )}
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
          renderSection("Lower Bracket", "accent", focusedRounds.lowerRounds)
        )}
        <p className="text-xs text-muted-foreground">
          {elimByes > 0
            ? `${teams.length} teams on a ${elimCapacity}-team bracket — top ${elimByes} seed${elimByes === 1 ? "" : "s"} received round-one byes. `
            : ""}
          {showLowerGuide
            ? "Lower Round 1 pairs each play-in loser with an upper Round 2 loser — no immediate rematches among play-in losers."
            : grandFinalMode === "none"
              ? "No Grand Final — the upper-bracket winner is crowned when they win the upper final."
              : grandFinalMode === "one_match"
                ? "Grand Final: one match between the upper- and lower-bracket winners decides the champion."
                : "Grand Final: upper-bracket winner vs lower-bracket winner. If the lower-bracket team wins, a bracket-reset match is added automatically."}
        </p>
      </div>
    );
  }

  const { bracketRounds, championshipRounds } = partitionChampionshipRounds(roundMetas);
  const focusedBracketRounds =
    bracketFocus === "all"
      ? bracketRounds
      : sliceEliminationRoundsForTopN(bracketRounds, teams.length, bracketFocus);

  return (
    <div className="space-y-4">
      {championship && (
        <ChampionBanner
          champion={championship.winner}
          team={teamByName.get(championship.winner)}
          variant={championship.variant}
        />
      )}
      {!readOnly && onApplyRecommendedFormats && (
        <BracketFormatToolbar onApplyRecommended={onApplyRecommendedFormats} />
      )}
      {availableTopSizes.length > 0 && (
        <BracketFocusControls
          bracketFocus={bracketFocus}
          availableTopSizes={availableTopSizes}
          onBracketFocusChange={setBracketFocus}
        />
      )}
      {renderSection(undefined, "primary", focusedBracketRounds, { splitChampionship: false })}
      {renderChampionshipStage(championshipRounds)}
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
  grandFinalMode?: GrandFinalMode,
): { winner: string; variant: "grand" | "final" } | null {
  const grand = resolveGrandFinalChampion(matches, grandFinalMode);
  if (grand) return { winner: grand, variant: "grand" };

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
  displayLabel,
  teamByName,
  readOnly,
  isGrand = false,
  slotHints,
  byeMarkers,
  onScoreChange,
  onPickWinner,
}: {
  match: ManagedMatch;
  format: BestOfFormat;
  displayLabel?: string;
  teamByName: Map<string, TournamentTeam>;
  readOnly?: boolean;
  isGrand?: boolean;
  slotHints?: { teamA?: string; teamB?: string };
  byeMarkers?: { teamA?: boolean; teamB?: boolean };
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
          {displayLabel ?? match.label}
        </span>
        <span
          className={cn(
            "font-tech text-[9px] uppercase tracking-wider",
            championCrowned ? "text-amber-300/80" : "text-muted-foreground/70",
          )}
        >
          {championCrowned
            ? "Champion"
            : matchDecided
              ? "Final"
              : `${format} · first to ${required}`}
        </span>
      </div>

      <ManagedTeamRow
        name={match.teamA}
        placeholder={slotHints?.teamA}
        isProtectedSeed={byeMarkers?.teamA}
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
        isProtectedSeed={byeMarkers?.teamB}
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
  isProtectedSeed = false,
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
  isProtectedSeed?: boolean;
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
      {!isTbd && isProtectedSeed && (
        <span title="Protected seed — round-one bye" className="shrink-0">
          <Shield className="h-3 w-3 text-muted-foreground/45" strokeWidth={1.5} aria-hidden />
        </span>
      )}
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
