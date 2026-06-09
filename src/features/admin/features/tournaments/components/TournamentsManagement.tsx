import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AdminRowActions } from "@/features/admin/components/AdminRowActions";
import { ConfirmDeleteDialog } from "@/features/admin/components/ConfirmDeleteDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminManagementTable,
  adminTableCellClip,
  adminTableTextTruncate,
} from "@/features/admin/components/AdminManagementTable";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { TOURNAMENTS_TABLE_COLUMNS } from "@/features/admin/constants/table-columns";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { StatusPill } from "@/features/admin/components/ui";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { compareByOrder, compareStrings } from "@/features/admin/utils/sort-comparators";
import { GAME_LABELS } from "@/features/tournaments/constants";
import type { TournamentStatus } from "@/lib/mock-data";
import { useTournaments } from "../hooks";
import type { AdminTournament } from "../types";
import { CreateTournamentModal } from "./CreateTournamentModal";
import { EditTournamentModal } from "./EditTournamentModal";
import { useDeleteTournament } from "../hooks/useDeleteTournament";

export function TournamentsManagement() {
  const navigate = useNavigate();
  const { tournaments, isLoading, error, prependTournament, replaceTournament, removeTournament } =
    useTournaments();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<AdminTournament | null>(null);
  const [deletingTournament, setDeletingTournament] = useState<AdminTournament | null>(null);
  const {
    submit: deleteTournamentSubmit,
    isDeleting,
    error: deleteError,
    resetError: resetDeleteError,
  } = useDeleteTournament();
  const tournamentStatusOrder = useMemo(
    () =>
      [
        "Draft",
        "Registration Open",
        "Registration Closed",
        "Live",
        "Completed",
        "Archived",
      ] as const satisfies readonly TournamentStatus[],
    [],
  );
  const sortComparators = useMemo(
    () => ({
      format: (a: AdminTournament, b: AdminTournament) => compareStrings(a.format, b.format),
      status: (a: AdminTournament, b: AdminTournament) =>
        compareByOrder(tournamentStatusOrder, a.status, b.status),
    }),
    [tournamentStatusOrder],
  );
  const { sortedItems, sortKey, direction, toggleSort } = useTableSort(
    tournaments,
    sortComparators,
  );
  const pagination = usePagination(sortedItems);

  useEffect(() => {
    pagination.setPage(1);
  }, [sortKey, direction, pagination.setPage]);

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
        description="Create and manage competitive events. Use bracket management for single elimination, double elimination, and Swiss formats once enough teams are approved."
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
          <AdminManagementTable columnWidths={TOURNAMENTS_TABLE_COLUMNS}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Tournament
                </TableHead>
                <SortableTableHead
                  label="Format"
                  sortKey="format"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Prize
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Teams
                </TableHead>
                <SortableTableHead
                  label="Status"
                  sortKey="status"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
                <TableHead className="text-right text-[10px] font-tech uppercase tracking-wider-2">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {/* Tournament name + meta */}
                    <TableCell>
                      <Skeleton className="h-4 w-40 mb-1.5" />
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                    {/* Format */}
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    {/* Prize */}
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    {/* Teams */}
                    <TableCell>
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                    {/* Status */}
                    <TableCell>
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : tournaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                    <TableCell className={adminTableCellClip}>
                      <div>
                        <div className={cn("font-display text-base tracking-wider", adminTableTextTruncate)}>
                          {t.name}
                        </div>
                        <div className={cn("text-xs text-muted-foreground", adminTableTextTruncate)}>
                          {GAME_LABELS[t.game]} · {t.region}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-sm text-muted-foreground", adminTableCellClip)}>
                      <span className={adminTableTextTruncate}>{t.format}</span>
                    </TableCell>
                    <TableCell className={cn("text-sm", adminTableCellClip)}>
                      <span className={adminTableTextTruncate}>{t.prizePool}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.teamsRegistered}/{t.teamCap}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={t.status} />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <AdminRowActions
                        onEdit={() => setEditingTournament(t)}
                        onDelete={() => {
                          resetDeleteError();
                          setDeletingTournament(t);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </AdminManagementTable>
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

      <EditTournamentModal
        open={editingTournament !== null}
        tournament={editingTournament}
        onClose={() => setEditingTournament(null)}
        onUpdated={replaceTournament}
      />

      <ConfirmDeleteDialog
        open={deletingTournament !== null}
        title="Delete tournament?"
        description={`This permanently removes ${deletingTournament?.name ?? "this tournament"} and unregisters all teams from it. Teams stay in Teams.${deleteError ? ` ${deleteError}` : ""}`}
        isDeleting={isDeleting}
        onClose={() => {
          resetDeleteError();
          setDeletingTournament(null);
        }}
        onConfirm={async () => {
          if (!deletingTournament) return;
          resetDeleteError();
          try {
            await deleteTournamentSubmit(deletingTournament.id);
            removeTournament(deletingTournament.id);
            resetDeleteError();
            setDeletingTournament(null);
          } catch {
            // deleteError shown in dialog
          }
        }}
      />
    </>
  );
}
