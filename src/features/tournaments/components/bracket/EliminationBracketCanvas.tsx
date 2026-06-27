import { useMemo, type ReactNode } from "react";
import {
  BRACKET_BAND_GAP,
  BRACKET_BAND_TITLE_H,
  BRACKET_CARD_W,
  BRACKET_COL_GAP,
  BRACKET_HEADER_H,
  buildLayout,
  type PositionedLayoutMatch,
} from "@/features/tournaments/utils/bracket-layout";
import type { LayoutInputMatch } from "@/features/tournaments/utils/bracket-connectors";
import type { BestOfFormat } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { cn } from "@/lib/utils";
import { BracketCanvas } from "./BracketCanvas";
import { BracketRoundFormatControl } from "./BracketRoundFormatControl";
import { ConnectorLayer } from "./ConnectorLayer";

export interface BracketRoundColumn {
  id: string;
  label: string;
  matchIds: string[];
  side?: string;
}

export interface BracketCanvasBand {
  title?: string;
  accent?: "primary" | "accent" | "warning";
  rounds: BracketRoundColumn[];
}

export interface BracketMatchRenderContext {
  displayLabel?: string;
}

interface EliminationBracketCanvasProps {
  rounds?: BracketRoundColumn[];
  bands?: BracketCanvasBand[];
  layoutMatches: LayoutInputMatch[];
  renderMatch: (matchId: string, context?: BracketMatchRenderContext) => ReactNode;
  renderRoundHeader?: (round: BracketRoundColumn) => ReactNode;
  className?: string;
  minHeight?: number;
  roundFormats?: Record<string, BestOfFormat>;
  lockedFormatRoundIds?: Set<string>;
  readOnlyFormats?: boolean;
  onFormatChange?: (roundId: string, format: BestOfFormat) => void;
}

const BAND_ACCENT_CLASS: Record<NonNullable<BracketCanvasBand["accent"]>, string> = {
  primary: "text-foreground/90",
  accent: "text-amber-400/90",
  warning: "text-amber-400",
};

function filterMatchesForRounds(
  layoutMatches: LayoutInputMatch[],
  rounds: BracketRoundColumn[],
): LayoutInputMatch[] {
  const roundIndexById = new Map(rounds.map((round, index) => [round.id, index]));
  const matchIds = new Set(rounds.flatMap((round) => round.matchIds));

  return layoutMatches
    .filter((match) => matchIds.has(match.id))
    .map((match) => {
      const owningRound = rounds.find((round) => round.matchIds.includes(match.id));
      return {
        ...match,
        roundId: owningRound?.id ?? match.roundId,
        roundIndex: owningRound
          ? (roundIndexById.get(owningRound.id) ?? match.roundIndex)
          : match.roundIndex,
        nextWinnerMatchId:
          match.nextWinnerMatchId && matchIds.has(match.nextWinnerMatchId)
            ? match.nextWinnerMatchId
            : null,
      };
    });
}

interface BandLayoutSlice {
  title?: string;
  accent?: BracketCanvasBand["accent"];
  top: number;
  width: number;
  height: number;
  roundIndices: number[];
  roundByFlowIndex: BracketRoundColumn[];
}

function useStackedBracketLayout(
  bands: BracketCanvasBand[],
  layoutMatches: LayoutInputMatch[],
  renderRoundHeader: boolean,
  formatRowOffset: number,
): {
  positioned: PositionedLayoutMatch[];
  width: number;
  height: number;
  bandLayouts: BandLayoutSlice[];
} {
  return useMemo(() => {
    if (bands.length === 0) {
      return { positioned: [], width: 0, height: 0, bandLayouts: [] };
    }

    const headerOffset = BRACKET_HEADER_H + (renderRoundHeader ? 28 : 0) + formatRowOffset;
    let yOffset = 0;
    const allPositioned: PositionedLayoutMatch[] = [];
    const bandLayouts: BandLayoutSlice[] = [];
    let maxWidth = 0;

    bands.forEach((band, bandIndex) => {
      if (band.rounds.length === 0) return;

      const titleOffset = band.title ? BRACKET_BAND_TITLE_H : 0;
      const bandTop = yOffset + titleOffset;
      const sectionMatches = filterMatchesForRounds(layoutMatches, band.rounds);
      const layout = buildLayout(sectionMatches);
      const bandHeight = layout.height + headerOffset;

      for (const match of layout.positioned) {
        allPositioned.push({
          ...match,
          y: match.y + bandTop + headerOffset,
        });
      }

      const roundByFlowIndex = layout.roundIndices.map((roundIndex) => band.rounds[roundIndex]);

      bandLayouts.push({
        title: band.title,
        accent: band.accent,
        top: yOffset,
        width: layout.width,
        height: bandHeight + titleOffset,
        roundIndices: layout.roundIndices,
        roundByFlowIndex,
      });

      maxWidth = Math.max(maxWidth, layout.width);
      yOffset = bandTop + bandHeight + (bandIndex < bands.length - 1 ? BRACKET_BAND_GAP : 0);
    });

    return {
      positioned: allPositioned,
      width: maxWidth,
      height: yOffset,
      bandLayouts,
    };
  }, [bands, layoutMatches, renderRoundHeader, formatRowOffset]);
}

function useSingleBracketLayout(
  rounds: BracketRoundColumn[],
  layoutMatches: LayoutInputMatch[],
  renderRoundHeader: boolean,
  formatRowOffset: number,
): {
  positioned: PositionedLayoutMatch[];
  width: number;
  height: number;
  bandLayouts: BandLayoutSlice[];
} {
  return useMemo(() => {
    if (rounds.length === 0) {
      return { positioned: [], width: 0, height: 0, bandLayouts: [] };
    }

    const sectionMatches = filterMatchesForRounds(layoutMatches, rounds);
    const layout = buildLayout(sectionMatches);
    const headerOffset = BRACKET_HEADER_H + (renderRoundHeader ? 28 : 0) + formatRowOffset;

    return {
      positioned: layout.positioned.map((match) => ({
        ...match,
        y: match.y + headerOffset,
      })),
      width: layout.width,
      height: layout.height + headerOffset,
      bandLayouts: [
        {
          top: 0,
          width: layout.width,
          height: layout.height + headerOffset,
          roundIndices: layout.roundIndices,
          roundByFlowIndex: layout.roundIndices.map((roundIndex) => rounds[roundIndex]),
        },
      ],
    };
  }, [rounds, layoutMatches, renderRoundHeader, formatRowOffset]);
}

export function EliminationBracketCanvas({
  rounds,
  bands,
  layoutMatches,
  renderMatch,
  renderRoundHeader,
  className,
  minHeight = 480,
  roundFormats,
  lockedFormatRoundIds,
  readOnlyFormats = true,
  onFormatChange,
}: EliminationBracketCanvasProps) {
  const effectiveBands = bands ?? (rounds ? [{ rounds }] : []);
  const formatRowOffset = !readOnlyFormats && onFormatChange ? 28 : 0;
  const showRoundHeader = !!renderRoundHeader;

  const stacked = useStackedBracketLayout(
    bands ? effectiveBands : [],
    layoutMatches,
    showRoundHeader,
    formatRowOffset,
  );
  const single = useSingleBracketLayout(
    !bands && rounds ? rounds : [],
    layoutMatches,
    showRoundHeader,
    formatRowOffset,
  );

  const { positioned, width, height, bandLayouts } = bands ? stacked : single;

  if (effectiveBands.every((band) => band.rounds.length === 0)) return null;

  const canvasMinHeight = bands && effectiveBands.length > 1 ? Math.max(minHeight, 640) : minHeight;

  return (
    <BracketCanvas className={className} minHeight={canvasMinHeight}>
      <div className="relative" style={{ width, paddingTop: 0 }}>
        {bandLayouts.map((bandLayout, bandIndex) => (
          <div key={bandIndex}>
            {bandLayout.title && (
              <div
                className="pointer-events-none absolute left-0 z-10 flex items-center gap-3"
                style={{ top: bandLayout.top, width }}
              >
                <div
                  className={cn(
                    "h-px flex-1 bg-gradient-to-r from-border/80 to-transparent",
                    bandLayout.accent === "accent" && "from-amber-400/40",
                    bandLayout.accent === "primary" && "from-foreground/20",
                  )}
                />
                <span
                  className={cn(
                    "shrink-0 font-tech text-xs font-bold uppercase tracking-[0.18em] text-foreground/80",
                    bandLayout.accent && BAND_ACCENT_CLASS[bandLayout.accent],
                  )}
                >
                  {bandLayout.title}
                </span>
                <div
                  className={cn(
                    "h-px flex-1 bg-gradient-to-l from-border/80 to-transparent",
                    bandLayout.accent === "accent" && "from-amber-400/40",
                    bandLayout.accent === "primary" && "from-foreground/20",
                  )}
                />
              </div>
            )}

            <div
              className="pointer-events-none absolute left-0 z-20 flex"
              style={{
                top: bandLayout.top + (bandLayout.title ? BRACKET_BAND_TITLE_H : 0),
                width: bandLayout.width,
              }}
            >
              {bandLayout.roundIndices.map((_, columnIndex) => {
                const round = bandLayout.roundByFlowIndex[columnIndex];
                if (!round) return null;
                const locked = lockedFormatRoundIds?.has(round.id) ?? false;
                const format = roundFormats?.[round.id] ?? "BO3";
                const showFormat = !readOnlyFormats && onFormatChange && round.side !== "grand";

                return (
                  <div
                    key={`${bandIndex}-${round.id}`}
                    className="pointer-events-auto flex cursor-default flex-col gap-1.5"
                    style={{
                      position: "absolute",
                      left: columnIndex * (BRACKET_CARD_W + BRACKET_COL_GAP),
                      width: BRACKET_CARD_W,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                      <span
                        className="max-w-[7.5rem] truncate font-tech text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/80"
                        title={round.label}
                      >
                        {round.label}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
                    </div>
                    {showFormat && (
                      <div className="flex justify-center">
                        <BracketRoundFormatControl
                          value={format}
                          disabled={locked}
                          compact
                          onChange={(next) => onFormatChange(round.id, next)}
                        />
                      </div>
                    )}
                    {renderRoundHeader?.(round)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pointer-events-none relative" style={{ width, height: height + 8 }}>
          <ConnectorLayer positioned={positioned} />
          {positioned.map((match) => (
            <div
              key={match.id}
              className="pointer-events-auto"
              style={{
                position: "absolute",
                left: match.x,
                top: match.y,
                width: BRACKET_CARD_W,
              }}
            >
              {renderMatch(match.id, {
                displayLabel: match.label,
              })}
            </div>
          ))}
        </div>
      </div>
    </BracketCanvas>
  );
}
