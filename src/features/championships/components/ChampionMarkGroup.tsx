import type { ChampionshipTitle } from "../types";
import { RoseStarMark } from "./RoseStarMark";

const SIZE = { sm: 11, md: 14, lg: 16 } as const;

interface ChampionMarkGroupProps {
  count?: number;
  titles?: ChampionshipTitle[];
  size?: keyof typeof SIZE;
  className?: string;
  /** Show a compact laurel label beside the marks */
  showLabel?: boolean;
}

function buildTooltip(titles: ChampionshipTitle[]): string {
  if (!titles.length) return "Champion";
  return titles.map((t) => t.tournamentName).join(" · ");
}

/** Row of rose rosettes — one per championship (T1-style legacy marks). */
export function ChampionMarkGroup({
  count,
  titles = [],
  size = "md",
  className = "",
  showLabel = false,
}: ChampionMarkGroupProps) {
  const markCount = count ?? titles.length;
  if (markCount <= 0) return null;

  const px = SIZE[size];
  const label = buildTooltip(titles.length ? titles : []);

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={label}
      aria-label={
        markCount === 1
          ? `Champion — ${label}`
          : `${markCount} championships — ${label}`
      }
    >
      {showLabel && (
        <span className="font-tech text-[8px] uppercase tracking-wider-2 text-white/45">
          Champion
        </span>
      )}
      <span className="inline-flex items-center gap-px text-white/55">
        {Array.from({ length: Math.min(markCount, 5) }, (_, i) => (
          <RoseStarMark key={i} size={px} className="shrink-0" />
        ))}
        {markCount > 5 && (
          <span className="ml-0.5 font-tech text-[9px] tracking-wider-2 text-white/40">
            +{markCount - 5}
          </span>
        )}
      </span>
    </span>
  );
}
