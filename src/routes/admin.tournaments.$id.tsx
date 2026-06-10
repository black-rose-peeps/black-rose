import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Calendar,
  CalendarClock,
  Coins,
  Gamepad2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
  UserRound,
  Users,
  Users2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AdminManagementTable,
  adminTableCellClip,
  adminTableTextTruncate,
} from "@/features/admin/components/AdminManagementTable";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { SortableTableHead } from "@/features/admin/components/SortableTableHead";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import {
  TOURNAMENT_REGISTRATIONS_SOLO_COLUMNS,
  TOURNAMENT_REGISTRATIONS_TEAM_COLUMNS,
} from "@/features/admin/constants/table-columns";
import { TournamentMetaStrip } from "@/features/admin/components/TournamentMetaStrip";
import { Panel, StatusPill } from "@/features/admin/components/ui";
import { BracketManager } from "@/features/admin/features/tournament-details/components/BracketManager";
import { TeamModal } from "@/features/admin/components/TeamModal";
import { ConfirmDeleteDialog } from "@/features/admin/components/ConfirmDeleteDialog";
import { AddMembersToTournamentDialog } from "@/features/admin/features/tournaments/components/AddMembersToTournamentDialog";
import { AddTeamToTournamentDialog } from "@/features/admin/features/tournaments/components/AddTeamToTournamentDialog";
import { EditTournamentModal } from "@/features/admin/features/tournaments/components/EditTournamentModal";
import { PrizeDistributionPanel } from "@/features/admin/features/tournaments/components/PrizeDistributionPanel";
import { useTournamentRegistrations } from "@/features/admin/features/tournaments/hooks";
import { useDeleteTournament } from "@/features/admin/features/tournaments/hooks/useDeleteTournament";
import { removeTeamFromTournament } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import {
  fetchTournamentById,
  updateTournamentStatus,
} from "@/features/admin/features/tournaments/services/tournaments.service";
import {
  formatBracketAvailability,
  supportsBracketManager as canUseBracketManager,
} from "@/features/admin/features/tournaments/utils";
import {
  isBracketSeedingStatus,
  REGISTRATION_STATUS_SORT_ORDER,
  tournamentHasUnresolvedRegistrations,
} from "@/features/admin/features/participants/constants/registration-status";
import { registrationStatusVariant } from "@/features/admin/features/participants/utils";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { compareByOrder } from "@/features/admin/utils/sort-comparators";
import { isTournamentConcluded } from "@/features/tournaments/utils/tournament-status";
import { usePagination } from "@/features/admin/hooks/usePagination";
import {
  isSoloTournament,
  participationTypeLabel,
  registrationCapLabel,
  wwmModeLabel,
} from "@/features/tournaments/types/participation";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
export const Route = createFileRoute("/admin/tournaments/$id")({
  loader: ({ params }) => {
    // Return only the ID — all Supabase calls happen client-side in the component.
    // This avoids the Node.js WebSocket error that occurs when supabase-js tries
    // to initialise its Realtime client during SSR on Node < 22.
    return { tournamentId: params.id };
  },
  component: TournamentDetailPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Tournament not found.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Couldn't load tournament: {error.message}
    </div>
  ),
});

// ── Client-side tournament fetch hook ─────────────────────────────────────

function useTournament(id: string) {
  const [tournament, setTournamentState] = useState<MockTournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchTournamentById(id)
      .then((t) => {
        if (cancelled) return;
        if (!t) {
          setError("Tournament not found.");
        } else {
          setTournamentState(t);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load tournament.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const patchTournament = (next: MockTournament) => {
    setTournamentState(next);
  };

  return { tournament, isLoading, error, patchTournament };
}

// ── Page component ─────────────────────────────────────────────────────────

function TournamentDetailPage() {
  const navigate = useNavigate();
  const { tournamentId } = Route.useLoaderData();
  const {
    tournament,
    isLoading: tournamentLoading,
    error: tournamentError,
    patchTournament,
  } = useTournament(tournamentId);

  const {
    registrations: teams,
    isLoading: teamsLoading,
    error: teamsError,
    prependRegistrations,
    removeRegistration,
    refetch: refetchRegistrations,
  } = useTournamentRegistrations(tournamentId);

  const registrationStatusOrder = useMemo(() => REGISTRATION_STATUS_SORT_ORDER, []);
  const teamSortComparators = useMemo(
    () => ({
      status: (a: MockTeam, b: MockTeam) =>
        compareByOrder(registrationStatusOrder, a.status, b.status),
    }),
    [registrationStatusOrder],
  );
  const {
    sortedItems: sortedTeams,
    sortKey: teamSortKey,
    direction: teamSortDirection,
    toggleSort: toggleTeamSort,
  } = useTableSort(teams, teamSortComparators);
  const teamsPagination = usePagination(sortedTeams);

  useEffect(() => {
    teamsPagination.setPage(1);
  }, [teamSortKey, teamSortDirection, teamsPagination.setPage]);
  const [openTeam, setOpenTeam] = useState<MockTeam | null>(null);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [isAddPlayersOpen, setIsAddPlayersOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [removingRegistration, setRemovingRegistration] = useState<MockTeam | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const {
    submit: deleteTournamentSubmit,
    isDeleting,
    error: deleteTournamentError,
    resetError: resetDeleteTournamentError,
  } = useDeleteTournament();

  // ── Loading state ──────────────────────────────────────────────────────

  if (tournamentLoading) {
    return (
      <>
        <AdminTopbar title="Loading…" subtitle="Tournament Operations" />
        <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full clip-angle" />
        </div>
      </>
    );
  }

  // ── Error / not found ──────────────────────────────────────────────────

  if (tournamentError || !tournament) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {tournamentError ?? "Tournament not found."}
      </div>
    );
  }

  // ── Loaded ─────────────────────────────────────────────────────────────

  const totalPlayers = teams.reduce((acc, t) => acc + t.members.length, 0);

  const bracketTeams = teams.filter((t) => isBracketSeedingStatus(t.status, tournament.status));
  const computedTeams = bracketTeams.map((t) => ({
    id: t.id,
    name: t.name,
    tag: t.tag,
    captain: t.captain,
    players: t.members.map((m) => ({ ign: m.ign, role: m.role })),
  }));

  const hasUnresolvedRegistrations = tournamentHasUnresolvedRegistrations(teams, tournament.status);
  const bracketNotice = hasUnresolvedRegistrations
    ? "Approve or reject all pending or previously competed participant registrations before opening bracket management."
    : formatBracketAvailability(tournament, computedTeams.length);
  const supportsBracketManager =
    !hasUnresolvedRegistrations &&
    (canUseBracketManager(tournament.format, computedTeams.length) ||
      (isTournamentConcluded(tournament.status) &&
        computedTeams.length >= 2 &&
        computedTeams.length % 2 === 0));
  const soloEvent = isSoloTournament(tournament);
  const capLabel = registrationCapLabel(tournament.participationType);
  const wwmLabel = wwmModeLabel(tournament.wwmMode);

  return (
    <>
      <AdminTopbar title={tournament.name} subtitle="Tournament Operations" />

      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit gap-2 font-tech uppercase tracking-wider"
            asChild
          >
            <Link to="/admin/tournaments">
              <ArrowLeft className="h-4 w-4" />
              Back to Tournaments
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {tournament.status === "Completed" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 font-tech text-[10px] uppercase tracking-wider"
                onClick={() => {
                  setArchiveError(null);
                  setIsArchiveOpen(true);
                }}
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 font-tech text-[10px] uppercase tracking-wider"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 font-tech text-[10px] uppercase tracking-wider text-destructive hover:text-destructive"
              onClick={() => {
                resetDeleteTournamentError();
                setIsDeleteOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        <TournamentMetaStrip
          className="clip-angle"
          items={[
            {
              label: "Game",
              value: tournament.game,
              icon: <Gamepad2 className="h-3.5 w-3.5" />,
            },
            {
              label: "Registration",
              value: wwmLabel
                ? `${participationTypeLabel(tournament.participationType)} · ${wwmLabel}`
                : participationTypeLabel(tournament.participationType),
              icon: <UserRound className="h-3.5 w-3.5" />,
            },
            {
              label: "Status",
              value: <StatusPill status={tournament.status} />,
              icon: <Trophy className="h-3.5 w-3.5" />,
            },
            {
              label: "Prize Pool",
              value: tournament.prizePool,
              highlight: true,
            },
            {
              label: "Start Date",
              value: tournament.startDate,
              icon: <Calendar className="h-3.5 w-3.5" />,
            },
            {
              label: "Reg. Deadline",
              value: tournament.registrationDeadline,
              icon: <CalendarClock className="h-3.5 w-3.5" />,
            },
            {
              label: capLabel,
              value: `${teams.length}/${tournament.teamCap}`,
              icon: <Users className="h-3.5 w-3.5" />,
            },
            {
              label: "Players",
              value: totalPlayers,
              icon: <Users2 className="h-3.5 w-3.5" />,
            },
          ]}
        />

        <Tabs defaultValue="teams" className="flex flex-col gap-4">
          <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="teams"
              className="gap-2 rounded-none border-b-2 border-transparent px-6 py-3 font-tech text-xs uppercase tracking-wider-2 data-[state=active]:border-foreground data-[state=active]:bg-card data-[state=active]:shadow-none"
            >
              <Users2 className="h-4 w-4" />
              {soloEvent ? "Registered Players" : "Registered Teams"}
              <Badge variant="secondary" className="font-tech text-[10px]">
                {teams.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="prizes"
              className="gap-2 rounded-none border-b-2 border-transparent px-6 py-3 font-tech text-xs uppercase tracking-wider-2 data-[state=active]:border-foreground data-[state=active]:bg-card data-[state=active]:shadow-none"
            >
              <Coins className="h-4 w-4" />
              Prize Distribution
            </TabsTrigger>
            <TabsTrigger
              value="bracket"
              disabled={!supportsBracketManager}
              title={supportsBracketManager ? undefined : bracketNotice || "Bracket unavailable"}
              className="gap-2 rounded-none border-b-2 border-transparent px-6 py-3 font-tech text-xs uppercase tracking-wider-2 data-[state=active]:border-foreground data-[state=active]:bg-card data-[state=active]:shadow-none"
            >
              <Trophy className="h-4 w-4" />
              Bracket Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prizes" className="mt-0">
            <PrizeDistributionPanel
              tournament={tournament}
              onUpdated={(updated) => patchTournament(updated)}
            />
          </TabsContent>

          <TabsContent value="teams" className="mt-0">
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
                <div>
                  <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Registrations
                  </p>
                  <h2 className="font-display text-xl font-bold tracking-wider-2">
                    {soloEvent ? "Registered Players" : "Registered Teams"}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 font-tech text-[10px] uppercase tracking-wider"
                    disabled={teamsLoading}
                    onClick={() => refetchRegistrations()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 font-tech uppercase tracking-wider"
                    disabled={teams.length >= tournament.teamCap}
                    title={
                      teams.length >= tournament.teamCap
                        ? `${capLabel} reached`
                        : soloEvent
                          ? "Register members directly"
                          : "Add a roster from Teams"
                    }
                    onClick={() => (soloEvent ? setIsAddPlayersOpen(true) : setIsAddTeamOpen(true))}
                  >
                    <Plus className="h-4 w-4" />
                    {soloEvent ? "Add Players" : "Add Teams"}
                  </Button>
                </div>
              </div>

              {teamsError && (
                <div className="px-6 pt-4">
                  <Alert variant="destructive">
                    <AlertDescription>{teamsError}</AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="p-6 pt-4">
                <AdminManagementTable
                  columnWidths={
                    soloEvent
                      ? TOURNAMENT_REGISTRATIONS_SOLO_COLUMNS
                      : TOURNAMENT_REGISTRATIONS_TEAM_COLUMNS
                  }
                >
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                        {soloEvent ? "Player" : "Team"}
                      </TableHead>
                      {soloEvent ? (
                        <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                          Discord
                        </TableHead>
                      ) : (
                        <>
                          <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                            Captain
                          </TableHead>
                          <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                            Members
                          </TableHead>
                        </>
                      )}
                      <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                        Registered
                      </TableHead>
                      <SortableTableHead
                        label="Status"
                        sortKey="status"
                        activeKey={teamSortKey}
                        direction={teamSortDirection}
                        onSort={toggleTeamSort}
                      />
                      <TableHead className="text-right text-[10px] font-tech uppercase tracking-wider-2">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamsLoading && teams.length === 0 ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
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
                      <TableRow>
                        <TableCell
                          colSpan={soloEvent ? 5 : 6}
                          className="py-12 text-center text-muted-foreground"
                        >
                          {soloEvent
                            ? "No players registered yet. Use Add Players to register members directly."
                            : "No teams registered yet. Use Add Teams to register rosters from the Teams tab."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      teamsPagination.paginatedItems.map((team) => {
                        const soloDiscord = team.members[0]?.discord ?? team.captain ?? undefined;

                        return (
                          <TableRow
                            key={team.id}
                            className="transition-colors hover:bg-secondary/40"
                          >
                            <TableCell className={adminTableCellClip}>
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center border border-border bg-secondary text-[10px] font-tech">
                                  {team.tag}
                                </div>
                                <div className="min-w-0">
                                  <div
                                    className={cn(
                                      "font-display text-base tracking-wider-2",
                                      adminTableTextTruncate,
                                    )}
                                    title={team.name}
                                  >
                                    {team.name}
                                  </div>
                                  {soloEvent ? (
                                    <div
                                      className={cn(
                                        "text-[10px] font-tech uppercase tracking-wider text-muted-foreground",
                                        adminTableTextTruncate,
                                      )}
                                    >
                                      Member registration
                                    </div>
                                  ) : (
                                    <div
                                      className={cn(
                                        "text-[10px] font-tech uppercase tracking-wider text-muted-foreground",
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
                              <TableCell
                                className={cn("text-muted-foreground", adminTableCellClip)}
                              >
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
                                <TableCell className={cn("text-sm", adminTableCellClip)}>
                                  <span className={adminTableTextTruncate} title={team.captain}>
                                    {team.captain}
                                  </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {team.members.length} members
                                </TableCell>
                              </>
                            )}
                            <TableCell className="text-muted-foreground">
                              {team.registrationDate}
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
                                  className="font-tech text-[10px] uppercase tracking-wider"
                                  onClick={() => setOpenTeam(team)}
                                >
                                  View
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="font-tech text-[10px] uppercase tracking-wider text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setRemoveError(null);
                                    setRemovingRegistration(team);
                                  }}
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

              <AdminTablePagination
                page={teamsPagination.page}
                totalPages={teamsPagination.totalPages}
                total={teamsPagination.total}
                rangeStart={teamsPagination.rangeStart}
                rangeEnd={teamsPagination.rangeEnd}
                onPageChange={teamsPagination.setPage}
              />
            </Panel>
          </TabsContent>

          <TabsContent value="bracket" className="mt-0">
            <Panel>
              <div className="border-b border-border px-6 py-4">
                <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  Admin
                </p>
                <h2 className="font-display text-xl font-bold tracking-wider-2">
                  Bracket Management
                </h2>
              </div>
              <div className="px-6 py-6">
                {supportsBracketManager ? (
                  <BracketManager
                    tournamentId={tournament.id}
                    tournamentName={tournament.name}
                    game={tournament.game}
                    region={tournament.region}
                    startDate={tournament.startDate}
                    format={tournament.format}
                    teamCap={tournament.teamCap}
                    teams={computedTeams}
                    initialBracket={[]}
                    tournamentStatus={tournament.status}
                    prizeBreakdown={tournament.prizeBreakdown}
                    onTournamentStatusChange={(status) =>
                      patchTournament({ ...tournament, status })
                    }
                  />
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="mx-auto max-w-lg">
                      {bracketNotice ||
                        "Bracket management is not available for this tournament yet."}
                    </p>
                    <p className="mt-2 text-sm">
                      {tournament.format} · {computedTeams.length}/{tournament.teamCap} teams
                      registered
                    </p>
                  </div>
                )}
              </div>
            </Panel>
          </TabsContent>
        </Tabs>
      </div>

      {openTeam && <TeamModal team={openTeam} onClose={() => setOpenTeam(null)} />}

      {soloEvent ? (
        <AddMembersToTournamentDialog
          open={isAddPlayersOpen}
          tournament={tournament}
          registeredEntries={teams}
          onClose={() => setIsAddPlayersOpen(false)}
          onAdded={(registrations) => {
            prependRegistrations(registrations);
            teamsPagination.setPage(1);
            patchTournament({
              ...tournament,
              teamsRegistered: tournament.teamsRegistered + registrations.length,
            });
          }}
        />
      ) : (
        <AddTeamToTournamentDialog
          open={isAddTeamOpen}
          tournament={tournament}
          registeredTeams={teams}
          onClose={() => setIsAddTeamOpen(false)}
          onAdded={(registrations) => {
            prependRegistrations(registrations);
            teamsPagination.setPage(1);
            patchTournament({
              ...tournament,
              teamsRegistered: tournament.teamsRegistered + registrations.length,
            });
          }}
        />
      )}

      <EditTournamentModal
        open={isEditOpen}
        tournament={tournament}
        onClose={() => setIsEditOpen(false)}
        onUpdated={patchTournament}
      />

      <ConfirmDeleteDialog
        open={isArchiveOpen}
        title="Archive tournament?"
        description={`${tournament.name} will be hidden from the public site but kept in admin for your records.${archiveError ? ` ${archiveError}` : ""}`}
        confirmLabel="Archive"
        isDeleting={isArchiving}
        onClose={() => {
          setArchiveError(null);
          setIsArchiveOpen(false);
        }}
        onConfirm={async () => {
          setIsArchiving(true);
          setArchiveError(null);
          try {
            const updated = await updateTournamentStatus(tournament.id, "Archived");
            patchTournament(updated);
            setIsArchiveOpen(false);
          } catch (err) {
            setArchiveError(err instanceof Error ? err.message : "Failed to archive tournament.");
          } finally {
            setIsArchiving(false);
          }
        }}
      />

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        title="Delete tournament?"
        description={`This permanently removes ${tournament.name} and unregisters all teams from it. Teams stay in Teams.${deleteTournamentError ? ` ${deleteTournamentError}` : ""}`}
        isDeleting={isDeleting}
        onClose={() => {
          resetDeleteTournamentError();
          setIsDeleteOpen(false);
        }}
        onConfirm={async () => {
          resetDeleteTournamentError();
          try {
            await deleteTournamentSubmit(tournament.id);
            navigate({ to: "/admin/tournaments" });
          } catch {
            // error shown in dialog
          }
        }}
      />

      <ConfirmDeleteDialog
        open={removingRegistration !== null}
        title={soloEvent ? "Remove player from tournament?" : "Remove team from tournament?"}
        description={`Remove ${removingRegistration?.name ?? (soloEvent ? "this player" : "this team")} from the event?${soloEvent ? "" : " The roster team stays in Teams."}${removeError ? ` ${removeError}` : ""}`}
        isDeleting={isRemoving}
        confirmLabel="Remove"
        onClose={() => setRemovingRegistration(null)}
        onConfirm={async () => {
          if (!removingRegistration) return;
          setIsRemoving(true);
          setRemoveError(null);
          try {
            await removeTeamFromTournament(removingRegistration.id);
            removeRegistration(removingRegistration.id);
            patchTournament({
              ...tournament,
              teamsRegistered: Math.max(0, tournament.teamsRegistered - 1),
            });
            setRemovingRegistration(null);
          } catch (err) {
            setRemoveError(err instanceof Error ? err.message : "Failed to remove team.");
          } finally {
            setIsRemoving(false);
          }
        }}
      />
    </>
  );
}
