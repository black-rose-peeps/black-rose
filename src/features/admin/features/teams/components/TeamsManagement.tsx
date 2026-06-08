import { useEffect, useMemo, useState } from "react";
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
import { TEAMS_TABLE_COLUMNS } from "@/features/admin/constants/table-columns";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { useMembers } from "@/features/admin/features/members/hooks";
import { compareByOrder } from "@/features/admin/utils/sort-comparators";
import { GAME_COLOR, GAME_OPTIONS } from "@/features/teams/constants";
import { useTeams } from "../hooks";
import type { Team } from "../types";
import { countActiveMembers, getTeamCaptainUsername } from "../utils";
import { useDeleteTeam } from "../hooks/useDeleteTeam";
import { AddTeamMemberDialog } from "./AddTeamMemberDialog";
import { CreateTeamModal } from "./CreateTeamModal";
import { EditTeamModal } from "./EditTeamModal";
import { TeamRosterDialog } from "./TeamRosterDialog";

export function TeamsManagement() {
  const { members, isLoading: membersLoading } = useMembers();
  const { teams, isLoading, error, prependTeam, updateTeam, removeTeam } = useTeams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [rosterTeam, setRosterTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const {
    submit: deleteTeamSubmit,
    isDeleting,
    error: deleteError,
    resetError: resetDeleteError,
  } = useDeleteTeam();
  const teamGameOrder = useMemo(() => GAME_OPTIONS.map((game) => game.value), []);
  const sortComparators = useMemo(
    () => ({
      game: (a: Team, b: Team) => compareByOrder(teamGameOrder, a.game, b.game),
      roster: (a: Team, b: Team) => countActiveMembers(a) - countActiveMembers(b),
    }),
    [teamGameOrder],
  );
  const { sortedItems, sortKey, direction, toggleSort } = useTableSort(teams, sortComparators);
  const pagination = usePagination(sortedItems);

  useEffect(() => {
    pagination.setPage(1);
  }, [sortKey, direction, pagination.setPage]);

  return (
    <>
      <AdminSection
        eyebrow="Roster Pipeline"
        title="Teams"
        description="Create teams and assign registered members to rosters before tournament registration."
        actions={
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="gap-2 font-tech uppercase tracking-wider"
            disabled={membersLoading || members.length === 0}
            title={members.length === 0 ? "Register at least one member first" : undefined}
          >
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        }
      >
        {members.length === 0 && !membersLoading && (
          <div className="px-6 pt-4">
            <Alert>
              <AlertDescription>
                Register members first under the Members tab before creating teams.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {error && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="p-6 pt-4">
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
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                ))
              ) : teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No teams yet. Create a team to start building rosters.
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((team) => (
                  <TableRow key={team.id} className="transition-colors hover:bg-secondary/40">
                    <TableCell className={adminTableCellClip}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center border border-border bg-secondary text-[10px] font-tech tracking-wider-2">
                          {team.tag}
                        </div>
                        <span className={cn("font-display text-base tracking-wider", adminTableTextTruncate)}>
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
                    <TableCell className={cn("text-sm text-muted-foreground", adminTableCellClip)}>
                      <span className={adminTableTextTruncate}>{getTeamCaptainUsername(team)}</span>
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
                          onEdit={() => setEditingTeam(team)}
                          onDelete={() => {
                            resetDeleteError();
                            setDeletingTeam(team);
                          }}
                        />
                      </div>
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
