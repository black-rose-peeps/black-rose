import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Crown, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EliminationStandingEntry } from "../../utils/team-standings";
import { StandingsPanelShell } from "./StandingsPanelShell";
import { TeamMatchHistoryList, TeamMatchHistoryStrip } from "./TeamMatchHistory";

interface EliminationStandingsTableProps {
  standings: EliminationStandingEntry[];
  teamTags?: Map<string, string>;
  eyebrow: string;
  subtitle?: string;
  isDoubleElim?: boolean;
}

const STATUS_LABEL: Record<EliminationStandingEntry["status"], string> = {
  champion: "Champion",
  active: "Active",
  advanced: "Advanced",
  eliminated: "Out",
};

const STATUS_CLASS: Record<EliminationStandingEntry["status"], string> = {
  champion: "border-amber-400/35 bg-amber-400/10 text-amber-200",
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  advanced: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  eliminated: "border-white/10 bg-white/[0.03] text-white/40",
};

export function EliminationStandingsTable({
  standings,
  teamTags,
  eyebrow,
  subtitle,
  isDoubleElim = false,
}: EliminationStandingsTableProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = standings.filter(
      (entry) => entry.status === "active" || entry.status === "champion",
    ).length;
    const eliminated = standings.filter((entry) => entry.status === "eliminated").length;
    return [
      { label: "Teams", value: standings.length },
      { label: "Active", value: active },
      { label: "Out", value: eliminated },
    ];
  }, [standings]);

  const resolvedSubtitle =
    subtitle ?? (isDoubleElim ? "Live double elimination records" : "Live win-loss records");

  return (
    <StandingsPanelShell eyebrow={eyebrow} subtitle={resolvedSubtitle} stats={stats}>
      <div className="overflow-hidden border border-white/[0.08] bg-[oklch(0.06_0_0)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
          <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-white/45">
            <Swords className="h-3.5 w-3.5" />
            Match records
          </div>
          <span className="font-tech text-[10px] uppercase tracking-wider text-white/30">
            Expand a row for full history
          </span>
        </div>

        <div className="custom-scrollbar max-h-[720px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-white/[0.08] bg-[oklch(0.08_0_0)]/95 backdrop-blur">
              <tr className="text-left font-tech text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                <th className="w-9 px-2 py-3" />
                <th className="px-3 py-3 text-center">Rank</th>
                <th className="px-3 py-3">Team</th>
                <th className="px-2 py-3 text-center">W</th>
                <th className="px-2 py-3 text-center">L</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="min-w-[8rem] px-3 py-3">History</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((entry) => {
                const tag = teamTags?.get(entry.team);
                const expanded = expandedTeam === entry.team;
                const isChampion = entry.status === "champion";
                const isPodium = entry.placement ? entry.placement <= 3 : entry.rank <= 3;

                return (
                  <Fragment key={entry.team}>
                    <tr
                      className={cn(
                        "group border-b border-white/[0.05] transition-colors hover:bg-white/[0.03]",
                        isChampion && "bg-amber-400/[0.04]",
                        entry.status === "active" && "border-l-2 border-l-emerald-400/35",
                        entry.status === "eliminated" && "opacity-90",
                      )}
                    >
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedTeam(expanded ? null : entry.team)}
                          className="grid h-8 w-8 place-items-center border border-white/10 text-white/45 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-white"
                          aria-label={
                            expanded ? "Collapse match history" : "Expand match history"
                          }
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex h-7 min-w-7 items-center justify-center gap-1 border px-1.5 font-mono text-xs font-bold tabular-nums",
                            isChampion
                              ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                              : isPodium
                                ? "border-white/20 bg-white/[0.06] text-white"
                                : "border-transparent text-white/45",
                          )}
                        >
                          {isChampion && <Crown className="h-3 w-3 shrink-0" />}
                          {entry.placement ?? entry.rank}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="grid h-7 w-7 shrink-0 place-items-center border border-white/15 bg-white/[0.05] font-tech text-[9px] font-bold uppercase text-white/80">
                              {(tag ?? entry.team.slice(0, 3)).slice(0, 3)}
                            </span>
                            <span className="truncate font-medium text-white">{entry.team}</span>
                          </div>
                          {entry.placementLabel && (
                            <span className="pl-9 font-tech text-[10px] uppercase tracking-wider text-white/35">
                              {entry.placementLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center font-mono text-sm font-bold tabular-nums text-emerald-300">
                        {entry.wins}
                      </td>
                      <td className="px-2 py-3 text-center font-mono text-sm tabular-nums text-white/45">
                        {entry.losses}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex border px-2 py-0.5 font-tech text-[10px] font-bold uppercase tracking-wider",
                            STATUS_CLASS[entry.status],
                          )}
                        >
                          {STATUS_LABEL[entry.status]}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <TeamMatchHistoryStrip history={entry.matchHistory} />
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <td colSpan={7} className="px-4 py-4 sm:px-6">
                          <p className="mb-3 font-tech text-[10px] uppercase tracking-[0.18em] text-white/35">
                            Match history · {entry.team}
                          </p>
                          <TeamMatchHistoryList history={entry.matchHistory} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </StandingsPanelShell>
  );
}
