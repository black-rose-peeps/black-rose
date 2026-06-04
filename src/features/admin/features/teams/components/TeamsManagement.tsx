import { useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useMembers } from "@/features/admin/features/members/hooks";
import { GAME_COLOR } from "@/features/teams/constants";
import { useTeams } from "../hooks";
import type { Team } from "../types";
import { countActiveMembers, getTeamCaptainUsername } from "../utils";
import { AddTeamMemberDialog } from "./AddTeamMemberDialog";
import { CreateTeamModal } from "./CreateTeamModal";

export function TeamsManagement() {
  const { members, isLoading: membersLoading } = useMembers();
  const { teams, isLoading, error, prependTeam, updateTeam } = useTeams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
  const pagination = usePagination(teams);

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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Team
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Game
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Captain
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Roster
                </TableHead>
                <TableHead className="text-right text-[10px] font-tech uppercase tracking-wider-2">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {/* Team tag + name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 shrink-0" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    {/* Game */}
                    <TableCell>
                      <Skeleton className="h-3.5 w-20" />
                    </TableCell>
                    {/* Captain */}
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    {/* Roster */}
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    {/* Actions */}
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
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center border border-border bg-secondary text-[10px] font-tech tracking-wider-2">
                          {team.tag}
                        </div>
                        <span className="font-display text-base tracking-wider">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-tech uppercase tracking-wider-2 ${GAME_COLOR[team.game]}`}
                      >
                        {team.game}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getTeamCaptainUsername(team)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {countActiveMembers(team)} players
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 font-tech text-[10px] uppercase tracking-wider"
                        onClick={() => setAddMemberTeam(team)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add Member
                      </Button>
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

      <CreateTeamModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        members={members}
        existingTeams={teams}
        onCreated={prependTeam}
      />

      <AddTeamMemberDialog
        open={addMemberTeam !== null}
        team={addMemberTeam}
        allMembers={members}
        onClose={() => setAddMemberTeam(null)}
        onUpdated={updateTeam}
      />
    </>
  );
}
