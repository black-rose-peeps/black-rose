import { ALL_GAMES, ALL_STATUSES, GAME_FILTERS, STATUS_CONFIG, STATUS_FILTERS } from "../constants";
import type { TournamentGame, TournamentStatus } from "../types";

interface TournamentFiltersProps {
  activeGame: typeof ALL_GAMES | TournamentGame;
  activeStatus: typeof ALL_STATUSES | TournamentStatus;
  onGameChange: (g: typeof ALL_GAMES | TournamentGame) => void;
  onStatusChange: (s: typeof ALL_STATUSES | TournamentStatus) => void;
  filteredCount: number;
  totalCount: number;
}

// Pill button — used for both game and status chips
function Chip({
  label,
  active,
  onClick,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: string; // optional colored dot
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 px-4 py-2 text-xs sm:text-sm font-tech uppercase tracking-[0.08em] transition-all duration-200 ${
        active
          ? "bg-white text-black font-semibold"
          : "bg-white/5 font-semibold text-muted-foreground hover:bg-white/10 hover:text-white"
      }`}
    >
      {accent && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-black/50" : accent}`} />
      )}
      {label}
    </button>
  );
}

export function TournamentFilters({
  activeGame,
  activeStatus,
  onGameChange,
  onStatusChange,
  filteredCount,
  totalCount,
}: TournamentFiltersProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Game row */}
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-tech uppercase tracking-wider-2 text-foreground">Game</span>
        <div className="flex flex-wrap gap-2">
          {GAME_FILTERS.map((g) => (
            <Chip key={g} label={g} active={activeGame === g} onClick={() => onGameChange(g)} />
          ))}
        </div>
      </div>

      {/* Status row */}
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-tech uppercase tracking-wider-2 text-foreground">Status</span>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => {
            const showDot = s !== ALL_STATUSES;
            const dotColor = showDot ? STATUS_CONFIG[s as TournamentStatus].dot : undefined;
            return (
              <Chip
                key={s}
                label={s}
                active={activeStatus === s}
                onClick={() => onStatusChange(s)}
                accent={dotColor}
              />
            );
          })}
        </div>
      </div>

      {/* Divider + count */}
      <div className="flex items-center justify-between border-t border-white/6 pt-4">
        <div className="h-px flex-1" />
        <span className="text-label-readable font-tech uppercase text-muted-foreground">
          <span className="text-white">{filteredCount}</span> / {totalCount} tournaments
        </span>
      </div>
    </div>
  );
}
