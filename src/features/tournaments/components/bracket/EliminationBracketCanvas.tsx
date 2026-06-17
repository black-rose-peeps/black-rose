import { useMemo, type ReactNode } from "react";
import {
  BRACKET_CARD_W,
  BRACKET_COL_GAP,
  BRACKET_HEADER_H,
  buildLayout,
} from "@/features/tournaments/utils/bracket-layout";
import type { LayoutInputMatch } from "@/features/tournaments/utils/bracket-connectors";
import { BracketCanvas } from "./BracketCanvas";
import { ConnectorLayer } from "./ConnectorLayer";

export interface BracketRoundColumn {
  id: string;
  label: string;
  matchIds: string[];
  side?: string;
}

interface EliminationBracketCanvasProps {
  rounds: BracketRoundColumn[];
  layoutMatches: LayoutInputMatch[];
  renderMatch: (matchId: string) => ReactNode;
  renderRoundHeader?: (round: BracketRoundColumn) => ReactNode;
  className?: string;
  minHeight?: number;
}

export function EliminationBracketCanvas({
  rounds,
  layoutMatches,
  renderMatch,
  renderRoundHeader,
  className,
  minHeight = 480,
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
          roundIndex: owningRound ? (roundIndexById.get(owningRound.id) ?? match.roundIndex) : match.roundIndex,
          nextWinnerMatchId:
            match.nextWinnerMatchId && matchIds.has(match.nextWinnerMatchId)
              ? match.nextWinnerMatchId
              : null,
        };
      });
  }, [layoutMatches, rounds]);

  const { positioned, width, height, roundIndices } = useMemo(() => {
    const layout = buildLayout(sectionLayoutMatches);
    const headerOffset = BRACKET_HEADER_H + (renderRoundHeader ? 28 : 0);
    return {
      ...layout,
      positioned: layout.positioned.map((match) => ({
        ...match,
        y: match.y + headerOffset,
      })),
      height: layout.height + headerOffset,
    };
  }, [sectionLayoutMatches, renderRoundHeader]);

  if (rounds.length === 0) return null;

  const labelByRoundIndex = new Map(
    rounds.map((round, index) => [index, round.label] as const),
  );

  return (
    <BracketCanvas className={className} minHeight={minHeight}>
      <div className="relative" style={{ width, paddingTop: 0 }}>
        <div className="absolute left-0 top-0 flex" style={{ width }}>
          {roundIndices.map((roundIndex, columnIndex) => (
            <div
              key={roundIndex}
              className="flex flex-col gap-2"
              style={{
                position: "absolute",
                left: columnIndex * (BRACKET_CARD_W + BRACKET_COL_GAP),
                width: BRACKET_CARD_W,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-border/80 to-transparent" />
                <span className="whitespace-nowrap font-tech text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {labelByRoundIndex.get(roundIndex)}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-border/80 to-transparent" />
              </div>
              {renderRoundHeader?.(rounds[columnIndex])}
            </div>
          ))}
        </div>

        <div className="relative" style={{ width, height: height + 8 }}>
          <ConnectorLayer positioned={positioned} />
          {positioned.map((match) => (
            <div
              key={match.id}
              style={{
                position: "absolute",
                left: match.x,
                top: match.y,
                width: BRACKET_CARD_W,
              }}
            >
              {renderMatch(match.id)}
            </div>
          ))}
        </div>
      </div>
    </BracketCanvas>
  );
}
