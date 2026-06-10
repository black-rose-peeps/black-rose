import { useMemo } from "react";
import { Swords, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";
import { SeedingTeamPicker } from "./SeedingTeamPicker";

interface SeedingPanelProps {
  teams: TournamentTeam[];
  assignments: Array<TournamentTeam | null>;
  bracketSize: number;
  seedingMatchCount: number;
  hasSwissByeSlot: boolean;
  disabled?: boolean;
  onTeamSelect: (slotIdx: number, teamId: string | null) => void;
}

export function SeedingPanel({
  teams,
  assignments,
  bracketSize,
  seedingMatchCount,
  hasSwissByeSlot,
  disabled = false,
  onTeamSelect,
}: SeedingPanelProps) {
  const usedTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const team of assignments) {
      if (team) ids.add(team.id);
    }
    return ids;
  }, [assignments]);

  const assignedCount = assignments.filter(Boolean).length;
  const progress = teams.length > 0 ? Math.round((assignedCount / teams.length) * 100) : 0;

  const unassignedTeams = useMemo(
    () => teams.filter((team) => !usedTeamIds.has(team.id)),
    [teams, usedTeamIds],
  );

  const readyMatches = useMemo(() => {
    let ready = 0;
    for (let i = 0; i < seedingMatchCount; i++) {
      const isByeSlot = hasSwissByeSlot && i === seedingMatchCount - 1;
      const teamAIdx = isByeSlot ? bracketSize - 1 : i * 2;
      const teamBIdx = i * 2 + 1;
      const teamA = assignments[teamAIdx];
      const teamB = isByeSlot ? null : assignments[teamBIdx];
      if (isByeSlot ? teamA : teamA && teamB) ready++;
    }
    return ready;
  }, [assignments, bracketSize, hasSwissByeSlot, seedingMatchCount]);

  return (
    <div className="p-8 border-b border-border">
      <div className="mb-6 overflow-hidden border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Round 1 seeding
              </p>
              <h3 className="mt-1 font-display text-lg tracking-wider">Match assignments</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 border border-border bg-secondary/30 px-2.5 py-1 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                <Users2 className="h-3.5 w-3.5" />
                {assignedCount}/{teams.length} teams
              </span>
              <span className="inline-flex items-center gap-1.5 border border-border bg-secondary/30 px-2.5 py-1 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                <Swords className="h-3.5 w-3.5" />
                {readyMatches}/{seedingMatchCount} matches ready
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-tech uppercase tracking-wider text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-secondary">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  progress === 100 ? "bg-amber-400" : "bg-foreground/70",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {unassignedTeams.length > 0 && (
          <div className="border-b border-border bg-secondary/10 px-5 py-3">
            <p className="mb-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Unassigned ({unassignedTeams.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {unassignedTeams.map((team) => (
                <span
                  key={team.id}
                  className="inline-flex max-w-full items-center gap-2 border border-border bg-background/60 px-2 py-1"
                  title={team.name}
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center border border-border bg-secondary text-[8px] font-tech">
                    {team.tag}
                  </span>
                  <span className="truncate font-display text-xs tracking-wider">{team.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {assignedCount === teams.length && teams.length > 0 && (
          <div className="border-b border-amber-400/30 bg-amber-400/5 px-5 py-3 font-tech text-[10px] uppercase tracking-wider text-amber-300/90">
            All teams assigned — you can generate the bracket.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: seedingMatchCount }, (_, i) => {
          const isByeSlot = hasSwissByeSlot && i === seedingMatchCount - 1;
          const teamAIdx = isByeSlot ? bracketSize - 1 : i * 2;
          const teamBIdx = i * 2 + 1;
          const teamA = assignments[teamAIdx];
          const teamB = isByeSlot ? null : assignments[teamBIdx];
          const isComplete = isByeSlot ? !!teamA : teamA && teamB;

          return (
            <div
              key={i}
              className={cn(
                "relative overflow-hidden border transition-colors",
                isComplete
                  ? "border-amber-400/35 bg-amber-400/[0.03]"
                  : "border-border bg-card hover:border-border-bright",
              )}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-white/[0.03] to-transparent" />
              <div className="relative flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="font-display text-sm tracking-wider">
                  Match {String(i + 1).padStart(2, "0")}
                </p>
                <span
                  className={cn(
                    "font-tech text-[10px] uppercase tracking-wider",
                    isComplete ? "text-amber-300/80" : "text-muted-foreground",
                  )}
                >
                  {isByeSlot
                    ? `Seed ${teamAIdx + 1} — BYE`
                    : `Seeds ${teamAIdx + 1} – ${teamBIdx + 1}`}
                </span>
              </div>

              <div
                className={cn(
                  "relative p-4",
                  isByeSlot ? "space-y-3" : "grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end",
                )}
              >
                <SeedingTeamPicker
                  label="Team A"
                  seed={teamAIdx + 1}
                  value={teamA ?? null}
                  teams={teams}
                  usedTeamIds={usedTeamIds}
                  onChange={(teamId) => onTeamSelect(teamAIdx, teamId)}
                  disabled={disabled}
                />

                {isByeSlot ? (
                  <div className="flex items-center justify-center border border-amber-400/20 bg-amber-400/5 py-3 font-display text-xs font-bold uppercase tracking-widest text-amber-400/80">
                    Bye — advances without opponent
                  </div>
                ) : (
                  <>
                    <div className="place-self-center py-1 font-display text-lg tracking-wider text-muted-foreground/40 md:pb-2">
                      vs
                    </div>
                    <SeedingTeamPicker
                      label="Team B"
                      seed={teamBIdx + 1}
                      value={teamB ?? null}
                      teams={teams}
                      usedTeamIds={usedTeamIds}
                      onChange={(teamId) => onTeamSelect(teamBIdx, teamId)}
                      disabled={disabled}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
