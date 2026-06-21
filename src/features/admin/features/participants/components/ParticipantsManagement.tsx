import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ClipboardList, Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminManagementTable,
  adminTableCellClip,
  adminTableTextTruncate,
} from "@/features/admin/components/AdminManagementTable";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitle } from "@/features/admin/constants/empty-state-titles";
import { PARTICIPANTS_TABLE_COLUMNS } from "@/features/admin/constants/table-columns";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { AdminTableSearch } from "@/features/admin/components/AdminTableSearch";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { matchesAdminParticipantDirectorySearch } from "@/features/admin/utils/search";
import { useParticipants } from "../hooks";
import type { ParticipantRow } from "../types";
import { compareByOrder, compareStrings } from "@/features/admin/utils/sort-comparators";
import {
  REGISTRATION_STATUS_SORT_ORDER,
  canBulkApproveParticipant,
  registrationActionPriority,
  registrationActionsEnabled,
  registrationNeedsReview,
} from "../constants/registration-status";
import { TeamModal } from "@/features/admin/components/TeamModal";
import { registrationStatusVariant } from "../utils";

export function ParticipantsManagement() {
  const {
    participants,
    isLoading,
    error,
    updatingId,
    isBulkUpdating,
    updateStatus,
    updateStatusesBulk,
  } = useParticipants();

  const [openTeam, setOpenTeam] = useState<ParticipantRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const registrationStatusOrder = useMemo(() => REGISTRATION_STATUS_SORT_ORDER, []);

  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    return participants.filter((participant) =>
      matchesAdminParticipantDirectorySearch(searchQuery, participant),
    );
  }, [participants, searchQuery]);

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
    filteredParticipants,

    sortComparators,
  );

  const pagination = usePagination(sortedItems);

  useEffect(() => {
    pagination.setPage(1);
  }, [sortKey, direction, searchQuery, pagination.setPage]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [pagination.page]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const approvableIds = new Set(
        participants
          .filter((p) => canBulkApproveParticipant(p.status, p.tournamentStatus))
          .map((p) => p.id),
      );
      const next = new Set([...prev].filter((id) => approvableIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [participants]);

  const approvableOnPage = pagination.paginatedItems.filter((team) =>
    canBulkApproveParticipant(team.status, team.tournamentStatus),
  );

  const selectedCount = selectedIds.size;

  const allApprovableSelected =
    approvableOnPage.length > 0 && approvableOnPage.every((team) => selectedIds.has(team.id));

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (checked) next.add(id);
      else next.delete(id);

      return next;
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());

      return;
    }

    setSelectedIds(new Set(approvableOnPage.map((team) => team.id)));
  }

  async function handleBulkApprove() {
    if (!selectedCount) return;

    const result = await updateStatusesBulk([...selectedIds], "Approved");

    const succeeded = new Set(result.updated.map((row) => row.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);

      for (const id of succeeded) next.delete(id);

      return next;
    });

    if (openTeam && succeeded.has(openTeam.id)) {
      const updated = result.updated.find((row) => row.id === openTeam.id);

      if (updated) setOpenTeam(updated);
    }
  }

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
        {selectedCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-muted/10 px-4 py-3">
            <span className="text-sm text-muted-foreground">{selectedCount} selected</span>

            <Button
              type="button"
              size="sm"
              disabled={isBulkUpdating}
              onClick={() => void handleBulkApprove()}
              className="font-tech text-[10px] uppercase tracking-wider-2"
            >
              {isBulkUpdating ? "Approving…" : `Approve ${selectedCount}`}
            </Button>
          </div>
        )}

        {isLoading ? (
          <AdminManagementTable columnWidths={PARTICIPANTS_TABLE_COLUMNS}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 px-2">
                  <Checkbox disabled aria-label="Select all approvable on this page" />
                </TableHead>
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
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className="px-2">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36 mb-1.5" />
                    <Skeleton className="h-3 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-7 w-[5.5rem] rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminManagementTable>
        ) : participants.length === 0 ? (
          <AdminEmptyState
            eyebrow="Registrations"
            title={<AdminEmptyTitle noun="registrations" />}
            description="Tournament entries show up here when teams or solo players register for an event. Open a tournament to add entrants manually, or approve pending sign-ups once registration is open."
            actions={
              <Button
                asChild
                size="sm"
                variant="outline"
                className="font-tech uppercase tracking-wider"
              >
                <Link to="/admin/tournaments">View Tournaments</Link>
              </Button>
            }
          />
        ) : (
          <>
            <AdminTableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by team, tournament, captain, or Discord username…"
            />
            {filteredParticipants.length === 0 ? (
              <AdminEmptyState
                embedded
                eyebrow="No Matches"
                title={
                  <>
                    No entries <span className="text-stroke">found.</span>
                  </>
                }
                description={`No participants match "${searchQuery.trim()}". Try team name, tournament, captain, or a roster member's Discord handle.`}
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-tech uppercase tracking-wider"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </Button>
                }
              />
            ) : (
              <>
            <AdminManagementTable columnWidths={PARTICIPANTS_TABLE_COLUMNS}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 px-2">
                    <Checkbox
                      checked={allApprovableSelected}
                      disabled={approvableOnPage.length === 0 || isBulkUpdating}
                      onCheckedChange={(value) => toggleSelectAllOnPage(value === true)}
                      aria-label="Select all approvable on this page"
                    />
                  </TableHead>

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
                {pagination.paginatedItems.map((team) => {
                const canSelect = canBulkApproveParticipant(team.status, team.tournamentStatus);

                const isSelected = selectedIds.has(team.id);

                return (
                  <TableRow key={team.id}>
                    <TableCell className="px-2">
                      <Checkbox
                        checked={isSelected}
                        disabled={!canSelect || isBulkUpdating}
                        onCheckedChange={(value) => toggleSelected(team.id, value === true)}
                        aria-label={`Select ${team.name}`}
                      />
                    </TableCell>

                    <TableCell className={adminTableCellClip}>
                      <button
                        type="button"
                        onClick={() => setOpenTeam(team)}
                        className="min-w-0 text-left transition hover:text-foreground"
                      >
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
                      </button>
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
                    <div className="flex items-center justify-end">
                      {(() => {
                        const needsReview = registrationNeedsReview(
                          team.status,
                          team.tournamentStatus,
                        );
                        return (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              "min-w-[5.5rem] gap-1.5 font-tech text-[10px] uppercase tracking-wider-2",
                              needsReview
                                ? "border-amber-400/35 bg-amber-400/[0.04] text-amber-100 hover:border-amber-400/50 hover:bg-amber-400/10"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => setOpenTeam(team)}
                          >
                            {needsReview ? (
                              <>
                                <ClipboardList className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                                Review
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                                View
                              </>
                            )}
                          </Button>
                        );
                      })()}
                    </div>
                  </TableCell>
                  </TableRow>
                );
              })}
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
              </>
            )}
          </>
        )}
      </div>

      {openTeam && (
        <TeamModal
          team={openTeam}
          tournamentName={openTeam.tournamentName}
          tournamentStatus={openTeam.tournamentStatus}
          isUpdating={updatingId === openTeam.id || isBulkUpdating}
          onClose={() => setOpenTeam(null)}
          onApprove={
            registrationActionsEnabled(openTeam.tournamentStatus)
              ? async () => {
                  const updated = await updateStatus(openTeam.id, "Approved");

                  setOpenTeam(updated);
                }
              : undefined
          }
          onReject={
            registrationActionsEnabled(openTeam.tournamentStatus)
              ? async () => {
                  const updated = await updateStatus(openTeam.id, "Rejected");

                  setOpenTeam(updated);
                }
              : undefined
          }
        />
      )}
    </AdminSection>
  );
}
