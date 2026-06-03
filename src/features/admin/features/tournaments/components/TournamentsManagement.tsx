import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { StatusPill } from "@/features/admin/components/ui";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { GAME_LABELS } from "@/features/tournaments/constants";
import { useTournaments } from "../hooks";
import type { AdminTournament } from "../types";
import { CreateTournamentModal } from "./CreateTournamentModal";

export function TournamentsManagement() {
  const navigate = useNavigate();
  const { tournaments, isLoading, error, prependTournament } = useTournaments();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const pagination = usePagination(tournaments);

  function handleCreated(tournament: AdminTournament) {
    prependTournament(tournament);
  }

  function openTournament(id: string) {
    navigate({ to: "/admin/tournaments/$id", params: { id } });
  }

  return (
    <>
      <AdminSection
        eyebrow="Events"
        title="Tournaments"
        description="Create and manage competitive events. Single-elimination brackets use the bracket manager when you have 16 teams registered."
        actions={
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="gap-2 font-tech uppercase tracking-wider"
          >
            <Plus className="h-4 w-4" />
            Create Tournament
          </Button>
        }
      >
        {error && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="p-6 pt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Tournament
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Format
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Prize
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Teams
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading tournaments…
                  </TableCell>
                </TableRow>
              ) : tournaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No tournaments yet. Create your first event to get started.
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((t) => (
                  <TableRow
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    onClick={() => openTournament(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openTournament(t.id);
                      }
                    }}
                  >
                    <TableCell>
                      <div>
                        <div className="font-display text-base tracking-wider">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {GAME_LABELS[t.game]} · {t.region}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.format}</TableCell>
                    <TableCell className="text-sm">{t.prizePool}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.teamsRegistered}/{t.teamCap}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={t.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <AdminTablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            onPageChange={pagination.setPage}
          />
        </div>
      </AdminSection>

      <CreateTournamentModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
