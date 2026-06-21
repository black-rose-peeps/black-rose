import { ChevronRight } from "lucide-react";
import { AdminRowActions } from "@/features/admin/components/AdminRowActions";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { StatusPill } from "@/features/admin/components/ui";
import { GAME_LABELS } from "@/features/tournaments/constants";
import type { AdminTournament } from "../types";

interface TournamentMobileListProps {
  tournaments: AdminTournament[];
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
  onEdit: (tournament: AdminTournament) => void;
  onDelete: (tournament: AdminTournament) => void;
}

/** Mobile-intentional tournament directory — card stack, not a shrunk table. */
export function TournamentMobileList({
  tournaments,
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
  onOpen,
  onEdit,
  onDelete,
}: TournamentMobileListProps) {
  return (
    <div className="md:hidden">
      <ul className="divide-y divide-white/8">
        {tournaments.map((tournament) => (
          <li key={tournament.id}>
            <div className="flex items-start gap-3 px-4 py-4">
              <button
                type="button"
                onClick={() => onOpen(tournament.id)}
                className="min-w-0 flex-1 text-left transition active:opacity-80"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-title text-base leading-snug">{tournament.name}</p>
                  <StatusPill status={tournament.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {GAME_LABELS[tournament.game]} · {tournament.region}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-tech text-label-readable uppercase text-muted-foreground">
                  <span>{tournament.format}</span>
                  <span>{tournament.prizePool}</span>
                  <span>
                    {tournament.teamsRegistered}/{tournament.teamCap} teams
                  </span>
                </div>
              </button>
              <div className="flex shrink-0 items-start gap-1">
                <div
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <AdminRowActions
                    onEdit={() => onEdit(tournament)}
                    onDelete={() => onDelete(tournament)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(tournament.id)}
                  className="touch-target inline-flex items-center justify-center text-muted-foreground/50"
                  aria-label={`Open ${tournament.name}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
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
