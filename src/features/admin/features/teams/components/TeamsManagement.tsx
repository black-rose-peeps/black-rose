import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Plus, UserPlus, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminRowActions } from "@/features/admin/components/AdminRowActions";
import { ConfirmDeleteDialog } from "@/features/admin/components/ConfirmDeleteDialog";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminManagementTable,
  adminTableCellClip,
  adminTableTextTruncate,
} from "@/features/admin/components/AdminManagementTable";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitle } from "@/features/admin/constants/empty-state-titles";
import { TEAMS_TABLE_COLUMNS } from "@/features/admin/constants/table-columns";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { AdminTableSearch } from "@/features/admin/components/AdminTableSearch";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { useMembers } from "@/features/admin/features/members/hooks";
import { compareByOrder } from "@/features/admin/utils/sort-comparators";
import { matchesAdminTeamDirectorySearch } from "@/features/admin/utils/search";
import { GAME_COLOR, GAME_OPTIONS } from "@/features/teams/constants";
import { useTeams } from "../hooks";
import type { Team } from "../types";
import { countActiveMembers, getTeamCaptainUsername } from "../utils";
import { useDeleteTeam } from "../hooks/useDeleteTeam";
import { AddTeamMemberDialog } from "./AddTeamMemberDialog";
import { CreateTeamModal } from "./CreateTeamModal";
import { EditTeamModal } from "./EditTeamModal";
import { TeamRosterDialog } from "./TeamRosterDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { TeamMobileList } from "./mobile";

export function TeamsManagement() {
  const isMobile = useIsMobile();
  const { members, isLoading: membersLoading } = useMembers();
  const { teams, isLoading, error, prependTeam, updateTeam, removeTeam } = useTeams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [rosterTeam, setRosterTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    submit: deleteTeamSubmit,
    isDeleting,
    error: deleteError,
    resetError: resetDeleteError,
  } = useDeleteTeam();
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    return teams.filter((team) => matchesAdminTeamDirectorySearch(searchQuery, team));
  }, [teams, searchQuery]);

  const teamGameOrder = useMemo(() => GAME_OPTIONS.map((game) => game.value), []);
  const sortComparators = useMemo(
    () => ({
      game: (a: Team, b: Team) => compareByOrder(teamGameOrder, a.game, b.game),
      roster: (a: Team, b: Team) => countActiveMembers(a) - countActiveMembers(b),
    }),
    [teamGameOrder],
  );
  const { sortedItems, sortKey, direction, toggleSort } = useTableSort(
    filteredTeams,
    sortComparators,
  );
  const pagination = usePagination(sortedItems);

  useEffect(() => {
    pagination.setPage(1);
  }, [sortKey, direction, searchQuery, pagination.setPage]);

  function handleEdit(team: Team) {
    setEditingTeam(team);
  }

  function handleDelete(team: Team) {
    resetDeleteError();
    setDeletingTeam(team);
  }

  return (
    <>
      <AdminSection
        eyebrow="Roster Pipeline"
        title="Teams"
        description="Teams appear here when verified members create them on the site, or when you build rosters from the console before tournament registration."
        actions={
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="touch-target min-h-11 gap-2 font-tech uppercase tracking-wider md:min-h-9"
            disabled={membersLoading || members.length === 0}
            title={members.length === 0 ? "Register at least one member first" : undefined}
          >
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        }
      >
        {error && (
          <div className="px-4 pt-4 sm:px-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="p-4 pt-4 sm:p-6">
          {isLoading ? (
            isMobile ? (
              <ul className="divide-y divide-white/8 md:hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-4">
                    <Skeleton className="h-11 w-11 shrink-0 rounded-none" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <AdminManagementTable columnWidths={TEAMS_TABLE_COLUMNS}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                      Team
                    </TableHead>
                    <SortableTableHead
                      label="Game"
                      sortKey="game"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                      Captain
                    </TableHead>
                    <SortableTableHead
                      label="Roster"
                      sortKey="roster"
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
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 shrink-0" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-3.5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-7 w-28 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </AdminManagementTable>
            )
          ) : teams.length === 0 ? (
            <AdminEmptyState
              eyebrow="Roster Pipeline"
              title={<AdminEmptyTitle noun="teams" />}
              description={
                members.length === 0
                  ? "Teams show up here when verified members create them under Teams on the site, or when you build rosters from this console. Members must sign in with Discord and react for ROSE in #tourna-roles (or be verified another way) before rosters can form."
                  : "Teams appear here when verified members create them on the user-side Teams page, or when you create one from this console. Pick a captain, fill the roster, then register for tournaments once entries open."
              }
              actions={
                members.length === 0 ? (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="font-tech uppercase tracking-wider"
                  >
                    <Link to="/admin/users">Go to Members</Link>
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    size="sm"
                    className="gap-2 font-tech uppercase tracking-wider"
                  >
                    <Plus className="h-4 w-4" />
                    Create Team
                  </Button>
                )
              }
            />
          ) : (
            <>
              <AdminTableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by team name, display name, or Discord username…"
              />
              {filteredTeams.length === 0 ? (
                <AdminEmptyState
                  embedded
                  eyebrow="No Matches"
                  title={
                    <>
                      No teams <span className="text-stroke">found.</span>
                    </>
                  }
                  description={`No teams match "${searchQuery.trim()}". Try team name, or a member's display name or Discord username.`}
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
                  <TeamMobileList
                    teams={pagination.paginatedItems}
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    rangeStart={pagination.rangeStart}
                    rangeEnd={pagination.rangeEnd}
                    onPageChange={pagination.setPage}
                    onRoster={setRosterTeam}
                    onAddMember={setAddMemberTeam}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  <div className="hidden md:block">
                    <AdminManagementTable columnWidths={TEAMS_TABLE_COLUMNS}>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                            Team
                          </TableHead>
                          <SortableTableHead
                            label="Game"
                            sortKey="game"
                            activeKey={sortKey}
                            direction={direction}
                            onSort={toggleSort}
                          />
                          <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                            Captain
                          </TableHead>
                          <SortableTableHead
                            label="Roster"
                            sortKey="roster"
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
                        {pagination.paginatedItems.map((team) => (
                          <TableRow
                            key={team.id}
                            className="transition-colors hover:bg-secondary/40"
                          >
                            <TableCell className={adminTableCellClip}>
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center border border-border bg-secondary text-[10px] font-tech tracking-wider-2">
                                  {team.tag}
                                </div>
                                <span
                                  className={cn(
                                    "font-display text-base tracking-wider",
                                    adminTableTextTruncate,
                                  )}
                                >
                                  {team.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className={adminTableCellClip}>
                              <span
                                className={cn(
                                  "block text-[10px] font-tech uppercase tracking-wider-2",
                                  adminTableTextTruncate,
                                  GAME_COLOR[team.game],
                                )}
                              >
                                {team.game}
                              </span>
                            </TableCell>
                            <TableCell
                              className={cn("text-sm text-muted-foreground", adminTableCellClip)}
                            >
                              <span className={adminTableTextTruncate}>
                                {getTeamCaptainUsername(team)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {countActiveMembers(team)} players
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 font-tech text-[10px] uppercase tracking-wider"
                                  onClick={() => setRosterTeam(team)}
                                >
                                  <Users className="h-3.5 w-3.5" />
                                  Roster
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 font-tech text-[10px] uppercase tracking-wider"
                                  onClick={() => setAddMemberTeam(team)}
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Add
                                </Button>
                                <AdminRowActions
                                  label="More"
                                  onEdit={() => handleEdit(team)}
                                  onDelete={() => handleDelete(team)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
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
                </>
              )}
            </>
          )}
        </div>
      </AdminSection>

      <CreateTeamModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        members={members}
        existingTeams={teams}
        onCreated={prependTeam}
      />

      <EditTeamModal
        open={editingTeam !== null}
        team={editingTeam}
        existingTeams={teams}
        onClose={() => setEditingTeam(null)}
        onUpdated={updateTeam}
      />

      <TeamRosterDialog
        open={rosterTeam !== null}
        team={rosterTeam}
        onClose={() => setRosterTeam(null)}
        onUpdated={(team) => {
          updateTeam(team);
          setRosterTeam(team);
        }}
      />

      <AddTeamMemberDialog
        open={addMemberTeam !== null}
        team={addMemberTeam}
        allMembers={members}
        allTeams={teams}
        onClose={() => setAddMemberTeam(null)}
        onUpdated={(team) => {
          updateTeam(team);
          if (addMemberTeam?.id === team.id) setAddMemberTeam(team);
        }}
      />

      <ConfirmDeleteDialog
        open={deletingTeam !== null}
        title="Delete team?"
        description={`This permanently removes ${deletingTeam?.name ?? "this team"}. Remove them from tournaments first.${deleteError ? ` ${deleteError}` : ""}`}
        isDeleting={isDeleting}
        onClose={() => {
          resetDeleteError();
          setDeletingTeam(null);
        }}
        onConfirm={async () => {
          if (!deletingTeam) return;
          resetDeleteError();
          try {
            await deleteTeamSubmit(deletingTeam.id);
            removeTeam(deletingTeam.id);
            resetDeleteError();
            setDeletingTeam(null);
          } catch {
            // deleteError shown in dialog
          }
        }}
      />
    </>
  );
}
