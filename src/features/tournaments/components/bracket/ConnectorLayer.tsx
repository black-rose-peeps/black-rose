import {
  BRACKET_CARD_H,
  BRACKET_CARD_W,
  type PositionedLayoutMatch,
} from "@/features/tournaments/utils/bracket-layout";

interface ConnectorLayerProps {
  positioned: PositionedLayoutMatch[];
}

export function ConnectorLayer({ positioned }: ConnectorLayerProps) {
  const map = new Map(positioned.map((match) => [match.id, match]));
  const paths: { d: string; completed?: boolean; live?: boolean; skip?: boolean }[] = [];

  for (const match of positioned) {
    const nextId = match.visualNextWinnerMatchId ?? match.nextWinnerMatchId;
    if (!nextId) continue;
    const from = map.get(match.id);
    const to = map.get(nextId);
    if (!from || !to) continue;

    const x1 = from.x + BRACKET_CARD_W;
    const y1 = from.y + BRACKET_CARD_H / 2;
    const x2 = to.x;
    const y2 = to.y + BRACKET_CARD_H / 2;
    const midX = x1 + (x2 - x1) / 2;
    const d = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
    const skip = to.roundIndex - from.roundIndex > 1;

    paths.push({
      d,
      completed: match.connectorStatus === "completed",
      live: match.connectorStatus === "live",
      skip,
    });
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width="100%"
      height="100%"
      style={{ overflow: "visible" }}
    >
      {paths.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill="none"
          stroke={
            path.completed
              ? "oklch(0.75 0.18 155)"
              : path.live
                ? "oklch(1 0 0)"
                : "oklch(0.52 0 0)"
          }
          strokeWidth={path.completed || path.live ? 2 : 1.75}
          strokeLinecap="square"
          strokeDasharray={path.skip ? "6 4" : undefined}
          opacity={path.completed ? 0.95 : path.live ? 0.9 : path.skip ? 0.82 : 0.78}
        />
      ))}
    </svg>
  );
}
