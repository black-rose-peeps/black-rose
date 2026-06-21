import { useMemo, type ReactNode } from "react";
import {
  BRACKET_CARD_W,
  BRACKET_COL_GAP,
  BRACKET_HEADER_H,
  buildColumnDisplayLabels,
  buildLayout,
} from "@/features/tournaments/utils/bracket-layout";
import type { LayoutInputMatch } from "@/features/tournaments/utils/bracket-connectors";
import type { BestOfFormat } from "@/features/admin/features/tournament-details/utils/managed-bracket";
import { BracketCanvas } from "./BracketCanvas";
import { BracketRoundFormatControl } from "./BracketRoundFormatControl";
import { ConnectorLayer } from "./ConnectorLayer";

export interface BracketRoundColumn {
  id: string;
  label: string;
  matchIds: string[];
  side?: string;
}

export interface BracketMatchRenderContext {
  displayLabel?: string;
}

interface EliminationBracketCanvasProps {
  rounds: BracketRoundColumn[];
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

export function EliminationBracketCanvas({
  rounds,
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
  const sectionLayoutMatches = useMemo(() => {
    const roundIndexById = new Map(rounds.map((round, index) => [round.id, index]));
    const matchIds = new Set(rounds.flatMap((round) => round.matchIds));

    return layoutMatches
      .filter((match) => matchIds.has(match.id))
      .map((match) => {
        const owningRound = rounds.find((round) => round.matchIds.includes(match.id));
        return {
          ...match,
          roundId: owningRound?.id ?? match.roundId,
          roundIndex: owningRound ? (roundIndexById.get(owningRound.id) ?? match.roundIndex) : match.roundIndex,
          nextWinnerMatchId:
            match.nextWinnerMatchId && matchIds.has(match.nextWinnerMatchId)
              ? match.nextWinnerMatchId
              : null,
        };
      });
  }, [layoutMatches, rounds]);

  const formatRowOffset = !readOnlyFormats && onFormatChange ? 28 : 0;

  const { positioned, width, height, roundIndices } = useMemo(() => {
    const layout = buildLayout(sectionLayoutMatches);
    const headerOffset = BRACKET_HEADER_H + (renderRoundHeader ? 28 : 0) + formatRowOffset;
    return {
      ...layout,
      positioned: layout.positioned.map((match) => ({
        ...match,
        y: match.y + headerOffset,
      })),
      height: layout.height + headerOffset,
    };
  }, [sectionLayoutMatches, renderRoundHeader, formatRowOffset]);

  if (rounds.length === 0) return null;

  const columnDisplayLabels = buildColumnDisplayLabels(positioned);
  const roundByFlowIndex = roundIndices.map((roundIndex) => rounds[roundIndex]);

  return (
    <BracketCanvas className={className} minHeight={minHeight}>
      <div className="relative" style={{ width, paddingTop: 0 }}>
        <div className="pointer-events-none absolute left-0 top-0 z-20 flex" style={{ width }}>
          {roundIndices.map((roundIndex, columnIndex) => {
            const round = roundByFlowIndex[columnIndex];
            if (!round) return null;
            const locked = lockedFormatRoundIds?.has(round.id) ?? false;
            const format = roundFormats?.[round.id] ?? "BO3";
            const showFormat = !readOnlyFormats && onFormatChange && round.side !== "grand";

            return (
              <div
                key={round.id}
                className="pointer-events-auto flex cursor-default flex-col gap-1.5"
                style={{
                  position: "absolute",
                  left: columnIndex * (BRACKET_CARD_W + BRACKET_COL_GAP),
                  width: BRACKET_CARD_W,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="h-px flex-1 bg-gradient-to-r from-border/80 to-transparent" />
                  <span
                    className="max-w-[7.5rem] truncate font-tech text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                    title={round.label}
                  >
                    {round.label}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-border/80 to-transparent" />
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
                displayLabel: columnDisplayLabels.get(match.id),
              })}
            </div>
          ))}
        </div>
      </div>
    </BracketCanvas>
  );
}
