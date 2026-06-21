import { cn } from "@/lib/utils";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { GAME_COLOR } from "@/features/teams/constants";
import type { Team } from "../../types";
import { countActiveMembers, getTeamCaptainUsername } from "../../utils";
import { TeamMobileRowActions } from "./TeamMobileRowActions";

interface TeamMobileListProps {
  teams: Team[];
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onRoster: (team: Team) => void;
  onAddMember: (team: Team) => void;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}

/** Mobile-intentional team directory — card stack, not a shrunk table. */
export function TeamMobileList({
  teams,
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
  onRoster,
  onAddMember,
  onEdit,
  onDelete,
}: TeamMobileListProps) {
  return (
    <div className="md:hidden">
      <ul className="divide-y divide-white/8">
        {teams.map((team) => (
          <li key={team.id}>
            <div className="flex items-start gap-3 px-4 py-4">
              <button
                type="button"
                onClick={() => onRoster(team)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left transition active:opacity-80"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center border border-white/15 bg-white/5 text-[10px] font-tech tracking-wider-2">
                  {team.tag}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base tracking-wider">{team.name}</p>
                  <p
                    className={cn(
                      "mt-0.5 font-tech text-label-readable uppercase",
                      GAME_COLOR[team.game],
                    )}
                  >
                    {team.game}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Captain · {getTeamCaptainUsername(team)}
                  </p>
                  <p className="mt-0.5 font-tech text-label-readable uppercase text-muted-foreground">
                    {countActiveMembers(team)} players
                  </p>
                </div>
              </button>
              <TeamMobileRowActions
                onRoster={() => onRoster(team)}
                onAddMember={() => onAddMember(team)}
                onEdit={() => onEdit(team)}
                onDelete={() => onDelete(team)}
              />
            </div>
          </li>
        ))}
      </ul>
      <AdminTablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={onPageChange}
        className="px-4"
      />
    </div>
  );
}
