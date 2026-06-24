import { cn } from "@/lib/utils";
import type { TeamMatchHistoryEntry } from "../../utils/team-standings";

interface TeamMatchHistoryStripProps {
  history: TeamMatchHistoryEntry[];
  className?: string;
}

const RESULT_CLASS: Record<TeamMatchHistoryEntry["result"], string> = {
  W: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
  L: "border-red-400/30 bg-red-400/10 text-red-300",
  Bye: "border-white/10 bg-white/[0.04] text-white/40",
};

export function TeamMatchHistoryStrip({ history, className }: TeamMatchHistoryStripProps) {
  if (history.length === 0) {
    return <span className="font-mono text-xs text-white/30">—</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {history.map((entry, index) => (
        <span
          key={`${entry.sortKey}-${index}`}
          title={
            entry.result === "Bye"
              ? `${entry.roundLabel} · Bye`
              : `${entry.roundLabel}${entry.opponent ? ` vs ${entry.opponent}` : ""}${
                  entry.score ? ` (${entry.score})` : ""
                }`
          }
          className={cn(
            "inline-grid h-6 min-w-6 place-items-center border px-1 font-mono text-[10px] font-bold",
            RESULT_CLASS[entry.result],
          )}
        >
          {entry.result}
        </span>
      ))}
    </div>
  );
}

export function TeamMatchHistoryList({ history }: { history: TeamMatchHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-white/40">No matches recorded yet.</p>;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {history.map((entry, index) => (
        <li
          key={`${entry.sortKey}-${index}`}
          className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.02] px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-white">
              {entry.result === "Bye" ? "Bye" : (entry.opponent ?? "TBD")}
            </p>
            <p className="font-tech text-[10px] uppercase tracking-wider text-white/35">
              {entry.matchLabel ?? entry.roundLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {entry.score && (
              <span className="font-mono text-xs tabular-nums text-white/40">{entry.score}</span>
            )}
            <span
              className={cn(
                "inline-grid h-7 min-w-7 place-items-center border font-mono text-xs font-bold",
                RESULT_CLASS[entry.result],
              )}
            >
              {entry.result}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
