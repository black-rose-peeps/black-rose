import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminManagementTable,
  adminTableCellClip,
  adminTableTextTruncate,
} from "@/features/admin/components/AdminManagementTable";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { PARTICIPANTS_TABLE_COLUMNS } from "@/features/admin/constants/table-columns";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { useParticipants } from "../hooks";
import type { ParticipantRow } from "../types";
import { compareByOrder, compareStrings } from "@/features/admin/utils/sort-comparators";
import {
  REGISTRATION_STATUS_SORT_ORDER,
  registrationActionPriority,
  registrationActionsEnabled,
} from "../constants/registration-status";
import { registrationStatusVariant } from "../utils";

export function ParticipantsManagement() {
  const { participants, isLoading, error, updatingId, updateStatus } = useParticipants();
  const registrationStatusOrder = useMemo(() => REGISTRATION_STATUS_SORT_ORDER, []);
  const sortComparators = useMemo(
    () => ({
      tournament: (a: ParticipantRow, b: ParticipantRow) =>
        compareStrings(a.tournamentName, b.tournamentName),
      registered: (a: ParticipantRow, b: ParticipantRow) =>
        compareStrings(a.registrationDate, b.registrationDate),
      status: (a: ParticipantRow, b: ParticipantRow) =>
        compareByOrder(registrationStatusOrder, a.status, b.status),
      actions: (a: ParticipantRow, b: ParticipantRow) =>
        registrationActionPriority(a.status, a.tournamentStatus) -
        registrationActionPriority(b.status, b.tournamentStatus),
    }),
    [registrationStatusOrder],
  );
  const { sortedItems, sortKey, direction, toggleSort } = useTableSort(
    participants,
    sortComparators,
  );
  const pagination = usePagination(sortedItems);

  useEffect(() => {
    pagination.setPage(1);
  }, [sortKey, direction, pagination.setPage]);

  return (
    <AdminSection
      eyebrow="Registrations"
      title="Participants"
      description="Approve or reject entries for active events. When a tournament is marked complete, approved entrants become Previously Competed."
    >
      {error && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="p-6 pt-4">
        <AdminManagementTable columnWidths={PARTICIPANTS_TABLE_COLUMNS}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Team
              </TableHead>
              <SortableTableHead
                label="Tournament"
                sortKey="tournament"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Captain
              </TableHead>
              <SortableTableHead
                label="Registered"
                sortKey="registered"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Status"
                sortKey="status"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Actions"
                sortKey="actions"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
                align="right"
                className="text-right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {/* Team name + tag */}
                  <TableCell>
                    <Skeleton className="h-4 w-36 mb-1.5" />
                    <Skeleton className="h-3 w-24" />
                  </TableCell>
                  {/* Tournament */}
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  {/* Captain */}
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  {/* Registered */}
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  {/* Status */}
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton className="h-7 w-16 rounded-md" />
                      <Skeleton className="h-7 w-14 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No registrations yet. Add teams from a tournament detail page.
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedItems.map((team) => {
                const isUpdating = updatingId === team.id;
                const actionsEnabled = registrationActionsEnabled(team.tournamentStatus);
                return (
                  <TableRow key={team.id}>
                    <TableCell className={adminTableCellClip}>
                      <div
                        className={cn(
                          "font-display text-base tracking-wider-2",
                          adminTableTextTruncate,
                        )}
                      >
                        {team.name}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground",
                          adminTableTextTruncate,
                        )}
                      >
                        {team.members.length} players · {team.tag}
                      </div>
                    </TableCell>
                    <TableCell className={adminTableCellClip}>
                      <Link
                        to="/admin/tournaments/$id"
                        params={{ id: team.tournamentId }}
                        className={cn(
                          "text-sm text-muted-foreground hover:text-foreground",
                          adminTableTextTruncate,
                        )}
                      >
                        {team.tournamentName}
                      </Link>
                    </TableCell>
                    <TableCell className={cn("text-sm", adminTableCellClip)}>
                      <span className={adminTableTextTruncate}>{team.captain}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {team.registrationDate}
                    </TableCell>
                    <TableCell>
                      <Badge variant={registrationStatusVariant(team.status)}>{team.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isUpdating || !actionsEnabled || team.status === "Approved"}
                          className="font-tech text-[10px] uppercase tracking-wider-2"
                          onClick={() => updateStatus(team.id, "Approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isUpdating || !actionsEnabled || team.status === "Rejected"}
                          className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:text-destructive"
                          onClick={() => updateStatus(team.id, "Rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
  );
}
