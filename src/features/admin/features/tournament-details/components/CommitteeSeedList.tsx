import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";
import { SeedingTeamPicker } from "./SeedingTeamPicker";

interface CommitteeSeedListProps {
  teamCount: number;
  assignments: Array<TournamentTeam | null>;
  teams: TournamentTeam[];
  disabled?: boolean;
  onTeamSelect: (slotIdx: number, teamId: string | null) => void;
}

export function CommitteeSeedList({
  teamCount,
  assignments,
  teams,
  disabled,
  onTeamSelect,
}: CommitteeSeedListProps) {
  const usedTeamIds = new Set(
    assignments.filter((team): team is TournamentTeam => !!team).map((team) => team.id),
  );

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: teamCount }, (_, index) => {
        const team = assignments[index] ?? null;
        const isTopSeed = index < 4;

        return (
          <div
            key={`committee-seed-${index}`}
            className={cn(
              "border bg-card p-3 transition-colors",
              team ? "border-amber-400/25" : "border-border",
            )}
          >
            <p className="mb-2 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
              Seed {index + 1}
              {isTopSeed ? " · Top" : ""}
            </p>
            <SeedingTeamPicker
              label=""
              seed={index + 1}
              value={team}
              teams={teams}
              usedTeamIds={usedTeamIds}
              onChange={(teamId) => onTeamSelect(index, teamId)}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}
