import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  Calendar,
  CalendarClock,
  Coins,
  Gamepad2,
  Pencil,
  Trash2,
  Trophy,
  UserRound,
  Users,
  Users2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { StatusPill } from "@/features/admin/components/ui";
import { TournamentMetaStrip } from "@/features/admin/components/TournamentMetaStrip";
import { BracketManager } from "@/features/admin/features/tournament-details/components/BracketManager";
import { AdminStandingsPanel } from "@/features/admin/features/tournament-details/components/AdminStandingsPanel";
import { TeamModal } from "@/features/admin/components/TeamModal";
import { ConfirmDeleteDialog } from "@/features/admin/components/ConfirmDeleteDialog";
import { AddMembersToTournamentDialog } from "@/features/admin/features/tournaments/components/AddMembersToTournamentDialog";
import { AddTeamToTournamentDialog } from "@/features/admin/features/tournaments/components/AddTeamToTournamentDialog";
import { EditTournamentModal } from "@/features/admin/features/tournaments/components/EditTournamentModal";
import { PrizeDistributionPanel } from "@/features/admin/features/tournaments/components/PrizeDistributionPanel";
import { TournamentRegistrationsPanel } from "@/features/admin/features/tournaments/components/TournamentRegistrationsPanel";
import { useTournamentRegistrations } from "@/features/admin/features/tournaments/hooks";
import { useDeleteTournament } from "@/features/admin/features/tournaments/hooks/useDeleteTournament";
import {
  removeTeamFromTournament,
  updateRegistrationStatus,
} from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import {
  fetchTournamentById,
  updateTournamentStatus,
} from "@/features/admin/features/tournaments/services/tournaments.service";
import {
  formatBracketAvailability,
  supportsBracketManager as canUseBracketManager,
} from "@/features/admin/features/tournaments/utils";
import { downloadTournamentRegistrationsCsv } from "@/features/admin/features/tournaments/utils/export-tournament-registrations-csv";
import {
  isBracketSeedingStatus,
  countSlotFilledRegistrations,
  countDisplayedTournamentEntrants,
  REGISTRATION_STATUS_SORT_ORDER,
  registrationActionsEnabled,
  tournamentHasUnresolvedRegistrations,
} from "@/features/admin/features/participants/constants/registration-status";
import { useTableSort } from "@/features/admin/hooks/useTableSort";
import { compareByOrder } from "@/features/admin/utils/sort-comparators";
import { compareRegistrationDates } from "@/features/admin/utils/registration-date";
import { isTournamentConcluded } from "@/features/tournaments/utils/tournament-status";
import { supportsEliminationStandings } from "@/features/tournaments/constants/formats";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  TournamentDetailMobileNav,
  TournamentMobileActionsMenu,
  TournamentMobileMetaStrip,
  type TournamentDetailTab,
} from "@/features/admin/features/tournaments/components/mobile";
import type { TournamentMetaItem } from "@/features/admin/components/TournamentMetaStrip";
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
    removeRegistration,
    updateRegistration,
    refetch: refetchRegistrations,
  } = useTournamentRegistrations(tournamentId);

  const registrationStatusOrder = useMemo(() => REGISTRATION_STATUS_SORT_ORDER, []);
  const teamSortComparators = useMemo(
    () => ({
      registered: (a: MockTeam, b: MockTeam) =>
        compareRegistrationDates(a.registrationDate, b.registrationDate),
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
  const [reviewingRegistrationId, setReviewingRegistrationId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<TournamentDetailTab>("teams");
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
        <AdminPageContent>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full clip-angle" />
        </AdminPageContent>
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

  const approvedCount = countSlotFilledRegistrations(teams);
  const displayedEntrantCount = countDisplayedTournamentEntrants(teams, tournament.status);
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
  const showStandingsTab = supportsEliminationStandings(tournament.format);
  const soloEvent = isSoloTournament(tournament);
  const capLabel = registrationCapLabel(tournament.participationType);
  const wwmLabel = wwmModeLabel(tournament.wwmMode);

  const metaItems: TournamentMetaItem[] = [
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
      label: "Registration Deadline",
      value: tournament.registrationDeadline,
      icon: <CalendarClock className="h-3.5 w-3.5" />,
    },
    {
      label: capLabel,
      value: `${displayedEntrantCount}/${tournament.teamCap}`,
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      label: "Players",
      value: totalPlayers,
      icon: <Users2 className="h-3.5 w-3.5" />,
    },
  ];

  const pendingCount = teams.filter(
    (team) => team.status === "Pending" || team.status === "Previously Competed",
  ).length;

  const mobileRegistrationRows = teamsPagination.paginatedItems.map((team) => ({
    id: team.id,
    name: team.name,
    tag: team.tag,
    captain: team.captain,
    memberCount: team.members.length,
    soloDiscord: team.members[0]?.discord ?? team.captain,
    registrationDate: team.registrationDate,
    status: team.status,
  }));

  const teamsPanelContent = (
    <TournamentRegistrationsPanel
      tournament={tournament}
      teams={teams}
      teamsLoading={teamsLoading}
      teamsError={teamsError}
      soloEvent={soloEvent}
      capLabel={capLabel}
      approvedCount={approvedCount}
      displayedEntrantCount={displayedEntrantCount}
      totalPlayers={totalPlayers}
      pendingCount={pendingCount}
      mobileRows={mobileRegistrationRows}
      paginatedTeams={teamsPagination.paginatedItems}
      page={teamsPagination.page}
      totalPages={teamsPagination.totalPages}
      total={teamsPagination.total}
      rangeStart={teamsPagination.rangeStart}
      rangeEnd={teamsPagination.rangeEnd}
      onPageChange={teamsPagination.setPage}
      teamSortKey={teamSortKey}
      teamSortDirection={teamSortDirection}
      onToggleTeamSort={toggleTeamSort}
      onRefresh={() => refetchRegistrations()}
      onDownloadCsv={() => downloadTournamentRegistrationsCsv(tournament, teams, soloEvent)}
      onAdd={() => (soloEvent ? setIsAddPlayersOpen(true) : setIsAddTeamOpen(true))}
      onViewTeam={setOpenTeam}
      onRemoveTeam={(team) => {
        setRemoveError(null);
        setRemovingRegistration(team);
      }}
    />
  );

  const standingsPanelContent = (
    <AdminStandingsPanel
      tournamentId={tournament.id}
      format={tournament.format}
      teams={teams}
      tournamentStatus={tournament.status}
      prizeBreakdown={tournament.prizeBreakdown}
    />
  );

  const bracketPanelContent = supportsBracketManager ? (
    <BracketManager
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      game={tournament.game}
      region={tournament.region}
      startDate={tournament.startDate}
      format={tournament.format}
      teamCap={tournament.teamCap}
      teams={computedTeams}
      tournamentStatus={tournament.status}
      prizeBreakdown={tournament.prizeBreakdown}
      onTournamentStatusChange={(status) => patchTournament({ ...tournament, status })}
    />
  ) : (
    <div className="py-12 text-center text-muted-foreground">
      <p className="mx-auto max-w-lg">
        {bracketNotice || "Bracket management is not available for this tournament yet."}
      </p>
      <p className="mt-2 text-sm">
        {tournament.format} · {computedTeams.length}/{tournament.teamCap} teams registered
      </p>
    </div>
  );

  return (
    <>
      <AdminTopbar title={tournament.name} subtitle="Tournament Operations" />

      <AdminPageContent className={isMobile ? "pb-24" : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="touch-target min-h-11 w-fit gap-2 font-tech uppercase tracking-wider"
            asChild
          >
            <Link to="/admin/tournaments">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          {isMobile ? (
            <TournamentMobileActionsMenu
              showArchive={tournament.status === "Completed"}
              onArchive={() => {
                setArchiveError(null);
                setIsArchiveOpen(true);
              }}
              onEdit={() => setIsEditOpen(true)}
              onDelete={() => {
                resetDeleteTournamentError();
                setIsDeleteOpen(true);
              }}
            />
          ) : (
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
          )}
        </div>

        {isMobile ? (
          <TournamentMobileMetaStrip className="clip-angle" items={metaItems} />
        ) : (
          <TournamentMetaStrip className="clip-angle" items={metaItems} />
        )}

        {isMobile ? (
          <>
            {mobileTab === "teams" ? teamsPanelContent : null}

            {mobileTab === "prizes" ? (
              <PrizeDistributionPanel
                tournament={tournament}
                onUpdated={(updated) => patchTournament(updated)}
              />
            ) : null}

            {showStandingsTab && mobileTab === "standings" ? standingsPanelContent : null}

            {mobileTab === "bracket" ? (
              <div className="overflow-hidden">{bracketPanelContent}</div>
            ) : null}

            <TournamentDetailMobileNav
              activeTab={mobileTab}
              onTabChange={setMobileTab}
              teamsLabel={soloEvent ? "Players" : "Teams"}
              teamsCount={teams.length}
              showStandings={showStandingsTab}
              bracketDisabled={!supportsBracketManager}
              bracketDisabledReason={bracketNotice || "Bracket unavailable"}
            />
          </>
        ) : (
          <Tabs defaultValue="teams" className="hidden flex-col gap-4 md:flex">
            <div className="custom-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <TabsList className="h-auto w-max min-w-full justify-start rounded-none border-b border-border bg-transparent p-0 sm:w-full">
                <TabsTrigger
                  value="teams"
                  className="touch-target shrink-0 gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-tech text-xs uppercase tracking-wider-2 data-[state=active]:border-foreground data-[state=active]:bg-card data-[state=active]:shadow-none sm:px-6"
                >
                  <Users2 className="h-4 w-4" />
                  <span className="sm:hidden">{soloEvent ? "Players" : "Teams"}</span>
                  <span className="hidden sm:inline">
                    {soloEvent ? "Registered Players" : "Registered Teams"}
                  </span>
                  <Badge variant="secondary" className="font-tech text-[10px]">
                    {teams.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="prizes"
                  className="touch-target shrink-0 gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-tech text-xs uppercase tracking-wider-2 data-[state=active]:border-foreground data-[state=active]:bg-card data-[state=active]:shadow-none sm:px-6"
                >
                  <Coins className="h-4 w-4" />
                  <span className="sm:hidden">Prizes</span>
                  <span className="hidden sm:inline">Prize Distribution</span>
                </TabsTrigger>
                <TabsTrigger
                  value="bracket"
                  disabled={!supportsBracketManager}
                  title={
                    supportsBracketManager ? undefined : bracketNotice || "Bracket unavailable"
                  }
                  className="touch-target shrink-0 gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-tech text-xs uppercase tracking-wider-2 data-[state=active]:border-foreground data-[state=active]:bg-card data-[state=active]:shadow-none sm:px-6"
                >
                  <Trophy className="h-4 w-4" />
                  <span className="sm:hidden">Bracket</span>
                  <span className="hidden sm:inline">Bracket Management</span>
                </TabsTrigger>
                {showStandingsTab && (
                  <TabsTrigger
                    value="standings"
                    className="touch-target shrink-0 gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-tech text-xs uppercase tracking-wider-2 data-[state=active]:border-foreground data-[state=active]:bg-card data-[state=active]:shadow-none sm:px-6"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="sm:hidden">Standings</span>
                    <span className="hidden sm:inline">Standings</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="prizes" className="mt-0">
              <PrizeDistributionPanel
                tournament={tournament}
                onUpdated={(updated) => patchTournament(updated)}
              />
            </TabsContent>

            <TabsContent value="teams" className="mt-0">
              {teamsPanelContent}
            </TabsContent>

            <TabsContent value="bracket" className="mt-0">
              {bracketPanelContent}
            </TabsContent>

            {showStandingsTab && (
              <TabsContent value="standings" className="mt-0">
                {standingsPanelContent}
              </TabsContent>
            )}
          </Tabs>
        )}
      </AdminPageContent>

      {openTeam && tournament && (
        <TeamModal
          team={openTeam}
          tournamentName={tournament.name}
          tournamentStatus={tournament.status}
          isUpdating={reviewingRegistrationId === openTeam.id}
          onClose={() => setOpenTeam(null)}
          onApprove={
            registrationActionsEnabled(tournament.status)
              ? async () => {
                  setReviewingRegistrationId(openTeam.id);
                  try {
                    const updated = await updateRegistrationStatus(openTeam.id, "Approved");
                    updateRegistration(updated);
                    setOpenTeam(updated);
                  } finally {
                    setReviewingRegistrationId(null);
                  }
                }
              : undefined
          }
          onReject={
            registrationActionsEnabled(tournament.status)
              ? async () => {
                  setReviewingRegistrationId(openTeam.id);
                  try {
                    const updated = await updateRegistrationStatus(openTeam.id, "Rejected");
                    updateRegistration(updated);
                    setOpenTeam(updated);
                  } finally {
                    setReviewingRegistrationId(null);
                  }
                }
              : undefined
          }
        />
      )}

      {soloEvent ? (
        <AddMembersToTournamentDialog
          open={isAddPlayersOpen}
          tournament={tournament}
          registeredEntries={teams}
          onClose={() => setIsAddPlayersOpen(false)}
          onAdded={async () => {
            try {
              await refetchRegistrations();
              const fresh = await fetchTournamentById(tournamentId);
              if (fresh) patchTournament(fresh);
            } catch (err) {
              console.error("[admin tournament] failed to refresh after adding players:", err);
            } finally {
              teamsPagination.setPage(1);
            }
          }}
        />
      ) : (
        <AddTeamToTournamentDialog
          open={isAddTeamOpen}
          tournament={tournament}
          registeredTeams={teams}
          onClose={() => setIsAddTeamOpen(false)}
          onAdded={async () => {
            try {
              await refetchRegistrations();
              const fresh = await fetchTournamentById(tournamentId);
              if (fresh) patchTournament(fresh);
            } catch (err) {
              console.error("[admin tournament] failed to refresh after adding team:", err);
            } finally {
              teamsPagination.setPage(1);
            }
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
            await refetchRegistrations();
            const fresh = await fetchTournamentById(tournamentId);
            if (fresh) patchTournament(fresh);
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
