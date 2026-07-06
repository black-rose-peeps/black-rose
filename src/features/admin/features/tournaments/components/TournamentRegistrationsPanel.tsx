import { Download, Plus, RefreshCw } from "lucide-react";
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
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import {
  TOURNAMENT_REGISTRATIONS_SOLO_COLUMNS,
  TOURNAMENT_REGISTRATIONS_TEAM_COLUMNS,
} from "@/features/admin/constants/table-columns";
import { registrationStatusVariant } from "@/features/admin/features/participants/utils";
import { formatRegistrationDateTime } from "@/features/admin/utils/registration-date";
import { FeaturePanelShell } from "@/features/shared/components/FeaturePanelShell";
import { cn } from "@/lib/utils";
import type { MockTeam } from "@/lib/mock-data";
import type { MockTournament } from "@/lib/mock-data";
import {
  TournamentRegistrationsMobileList,
  type TournamentRegistrationMobileRow,
} from "./mobile/TournamentRegistrationsMobileList";
import { TournamentRegistrationsEmptyState } from "./TournamentRegistrationsEmptyState";

interface TournamentRegistrationsPanelProps {
  tournament: MockTournament;
  teams: MockTeam[];
  teamsLoading: boolean;
  teamsError: string | null;
  soloEvent: boolean;
  capLabel: string;
  approvedCount: number;
  displayedEntrantCount: number;
  totalPlayers: number;
  pendingCount: number;
  mobileRows: TournamentRegistrationMobileRow[];
  paginatedTeams: MockTeam[];
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  teamSortKey: string | null;
  teamSortDirection: "asc" | "desc";
  onToggleTeamSort: (key: string) => void;
  onRefresh: () => void;
  onDownloadCsv: () => void;
  onAdd: () => void;
  onViewTeam: (team: MockTeam) => void;
  onRemoveTeam: (team: MockTeam) => void;
}

export function TournamentRegistrationsPanel({
  tournament,
  teams,
  teamsLoading,
  teamsError,
  soloEvent,
  capLabel,
  approvedCount,
  displayedEntrantCount,
  totalPlayers,
  pendingCount,
  mobileRows,
  paginatedTeams,
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
  teamSortKey,
  teamSortDirection,
  onToggleTeamSort,
  onRefresh,
  onDownloadCsv,
  onAdd,
  onViewTeam,
  onRemoveTeam,
}: TournamentRegistrationsPanelProps) {
  const title = soloEvent ? "Registered Players" : "Registered Teams";
  const addLabel = soloEvent ? "Add Players" : "Add Teams";
  const capReached = approvedCount >= tournament.teamCap;
  const rejectedCount = teams.filter((team) => team.status === "Rejected").length;

  const stats = [
    { label: capLabel, value: `${displayedEntrantCount}/${tournament.teamCap}`, accent: true },
    ...(pendingCount > 0 ? [{ label: "Pending", value: pendingCount }] : []),
    ...(rejectedCount > 0 ? [{ label: "Rejected", value: rejectedCount }] : []),
    ...(soloEvent ? [] : [{ label: "Players", value: totalPlayers }]),
  ];

  const actionsBar = (
    <div className="flex flex-wrap items-center gap-2 [&_button]:min-h-11 sm:[&_button]:min-h-9">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 border-white/10 bg-white/[0.02] font-tech text-[10px] uppercase tracking-wider hover:bg-white/[0.05]"
        disabled={teamsLoading || teams.length === 0}
        onClick={onDownloadCsv}
      >
        <Download className="h-3.5 w-3.5" />
        Download CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 border-white/10 bg-white/[0.02] font-tech text-[10px] uppercase tracking-wider hover:bg-white/[0.05]"
        disabled={teamsLoading}
        onClick={onRefresh}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </Button>
      <Button
        type="button"
        size="sm"
        className="gap-2 font-tech uppercase tracking-wider"
        disabled={capReached}
        title={capReached ? `${capLabel} reached` : undefined}
        onClick={onAdd}
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );

  return (
    <FeaturePanelShell
      unified
      eyebrow="Admin Console · Registrations"
      title={title}
      subtitle={
        soloEvent
          ? "Review member sign-ups, approve entrants, and manage the player queue for this event."
          : "Review roster sign-ups, approve teams, and manage the registration queue for this event."
      }
      stats={stats}
      actionsBar={actionsBar}
      contentClassName="bg-[oklch(0.06_0_0)]"
    >
      {teamsError && (
        <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6">
          <Alert variant="destructive">
            <AlertDescription>{teamsError}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="hidden md:block">
        <div className="overflow-x-auto px-4 py-4 sm:px-6">
          <AdminManagementTable
            columnWidths={
              soloEvent
                ? TOURNAMENT_REGISTRATIONS_SOLO_COLUMNS
                : TOURNAMENT_REGISTRATIONS_TEAM_COLUMNS
            }
            className="border border-white/[0.08] bg-[oklch(0.05_0_0)]"
          >
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="border-white/[0.06] bg-white/[0.02] text-[10px] font-tech uppercase tracking-[0.18em] text-white/45">
                  {soloEvent ? "Player" : "Team"}
                </TableHead>
                {soloEvent ? (
                  <TableHead className="border-white/[0.06] bg-white/[0.02] text-[10px] font-tech uppercase tracking-[0.18em] text-white/45">
                    Discord
                  </TableHead>
                ) : (
                  <>
                    <TableHead className="border-white/[0.06] bg-white/[0.02] text-[10px] font-tech uppercase tracking-[0.18em] text-white/45">
                      Captain
                    </TableHead>
                    <TableHead className="border-white/[0.06] bg-white/[0.02] text-[10px] font-tech uppercase tracking-[0.18em] text-white/45">
                      Members
                    </TableHead>
                  </>
                )}
                <SortableTableHead
                  label="Registered"
                  sortKey="registered"
                  activeKey={teamSortKey}
                  direction={teamSortDirection}
                  onSort={onToggleTeamSort}
                  className="border-white/[0.06] bg-white/[0.02] text-[10px] font-tech uppercase tracking-[0.18em] text-white/45"
                />
                <SortableTableHead
                  label="Status"
                  sortKey="status"
                  activeKey={teamSortKey}
                  direction={teamSortDirection}
                  onSort={onToggleTeamSort}
                  className="border-white/[0.06] bg-white/[0.02] text-[10px] font-tech uppercase tracking-[0.18em] text-white/45"
                />
                <TableHead className="border-white/[0.06] bg-white/[0.02] text-right text-[10px] font-tech uppercase tracking-[0.18em] text-white/45">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamsLoading && teams.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-white/[0.06] hover:bg-transparent">
                    <TableCell className={adminTableCellClip}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Skeleton className="h-9 w-9 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-full max-w-32" />
                          <Skeleton className="h-3 w-full max-w-20" />
                        </div>
                      </div>
                    </TableCell>
                    {soloEvent ? (
                      <TableCell className={adminTableCellClip}>
                        <Skeleton className="h-4 w-full max-w-24" />
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className={adminTableCellClip}>
                          <Skeleton className="h-4 w-full max-w-20" />
                        </TableCell>
                        <TableCell className={adminTableCellClip}>
                          <Skeleton className="h-4 w-full max-w-16" />
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-7 w-14 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : teams.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={soloEvent ? 5 : 6} className="p-4 sm:p-6">
                    <TournamentRegistrationsEmptyState
                      soloEvent={soloEvent}
                      addLabel={addLabel}
                      capLabel={capLabel}
                      teamCap={tournament.teamCap}
                      capReached={capReached}
                      onAdd={onAdd}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTeams.map((team) => {
                  const soloDiscord = team.members[0]?.discord ?? team.captain ?? undefined;

                  return (
                    <TableRow
                      key={team.id}
                      className="border-white/[0.06] transition-colors hover:bg-white/[0.03]"
                    >
                      <TableCell className={adminTableCellClip}>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center border border-white/15 bg-white/[0.04] text-[10px] font-tech text-white/70">
                            {team.tag}
                          </div>
                          <div className="min-w-0">
                            <div
                              className={cn(
                                "font-display text-base tracking-wider-2 text-white",
                                adminTableTextTruncate,
                              )}
                              title={team.name}
                            >
                              {team.name}
                            </div>
                            {soloEvent ? (
                              <div
                                className={cn(
                                  "text-[10px] font-tech uppercase tracking-wider text-white/40",
                                  adminTableTextTruncate,
                                )}
                              >
                                Member registration
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "text-[10px] font-tech uppercase tracking-wider text-white/40",
                                  adminTableTextTruncate,
                                )}
                              >
                                {team.members.length}{" "}
                                {team.members.length === 1 ? "player" : "players"}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {soloEvent ? (
                        <TableCell className={cn("text-white/55", adminTableCellClip)}>
                          <span className={adminTableTextTruncate} title={soloDiscord}>
                            {soloDiscord
                              ? soloDiscord.startsWith("@")
                                ? soloDiscord
                                : `@${soloDiscord}`
                              : "—"}
                          </span>
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className={cn("text-sm text-white/75", adminTableCellClip)}>
                            <span className={adminTableTextTruncate} title={team.captain}>
                              {team.captain}
                            </span>
                          </TableCell>
                          <TableCell className="text-white/45">
                            {team.members.length} members
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-white/45" title={team.registrationDate}>
                        {formatRegistrationDateTime(team.registrationDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={registrationStatusVariant(team.status)}>
                          {team.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-white/10 bg-white/[0.02] font-tech text-[10px] uppercase tracking-wider hover:bg-white/[0.05]"
                            onClick={() => onViewTeam(team)}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="font-tech text-[10px] uppercase tracking-wider text-red-400 hover:bg-red-950/20 hover:text-red-300"
                            onClick={() => onRemoveTeam(team)}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </AdminManagementTable>
        </div>

        {teams.length > 0 && (
          <div className="px-4 sm:px-6">
            <AdminTablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>

      <div className="md:hidden">
        {teamsLoading && teams.length === 0 ? (
          <ul className="divide-y divide-white/[0.06]">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="space-y-2 px-4 py-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </li>
            ))}
          </ul>
        ) : teams.length === 0 ? (
          <div className="px-4 py-4 sm:px-6">
            <TournamentRegistrationsEmptyState
              soloEvent={soloEvent}
              addLabel={addLabel}
              capLabel={capLabel}
              teamCap={tournament.teamCap}
              capReached={capReached}
              onAdd={onAdd}
            />
          </div>
        ) : (
          <TournamentRegistrationsMobileList
            rows={mobileRows}
            soloEvent={soloEvent}
            page={page}
            totalPages={totalPages}
            total={total}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={onPageChange}
            onView={(id) => {
              const team = teams.find((entry) => entry.id === id);
              if (team) onViewTeam(team);
            }}
            onRemove={(row) => {
              const team = teams.find((entry) => entry.id === row.id);
              if (team) onRemoveTeam(team);
            }}
          />
        )}
      </div>
    </FeaturePanelShell>
  );
}
