import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, RefreshCw, Trash2, Trophy, Users2 } from "lucide-react";
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
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { Panel } from "@/features/admin/components/ui";
import { BracketManager } from "@/features/admin/features/tournament-details/components/BracketManager";
import { TeamModal } from "@/features/admin/components/TeamModal";
import { ConfirmDeleteDialog } from "@/features/admin/components/ConfirmDeleteDialog";
import { AddTeamToTournamentDialog } from "@/features/admin/features/tournaments/components/AddTeamToTournamentDialog";
import { EditTournamentModal } from "@/features/admin/features/tournaments/components/EditTournamentModal";
import { useTournamentRegistrations } from "@/features/admin/features/tournaments/hooks";
import { useDeleteTournament } from "@/features/admin/features/tournaments/hooks/useDeleteTournament";
import { removeTeamFromTournament } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { fetchTournamentById } from "@/features/admin/features/tournaments/services/tournaments.service";
import {
  formatBracketAvailability,
  supportsBracketManager as canUseBracketManager,
} from "@/features/admin/features/tournaments/utils";
import { registrationStatusVariant } from "@/features/admin/features/participants/utils";
import { usePagination } from "@/features/admin/hooks/usePagination";
import type { MockTeam, MockTournament } from "@/lib/mock-data";
import { mockTournamentDetails } from "@/lib/mock-tournament-details";

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

  const teamsPagination = usePagination(teams);
  const [openTeam, setOpenTeam] = useState<MockTeam | null>(null);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [removingRegistration, setRemovingRegistration] = useState<MockTeam | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const {
    submit: deleteTournamentSubmit,
    isDeleting,
    error: deleteTournamentError,
  } = useDeleteTournament();

  // ── Loading state ──────────────────────────────────────────────────────

  if (tournamentLoading) {
    return (
      <>
        <AdminTopbar title="Loading…" subtitle="Tournament Operations" />
        <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-card px-6 py-6">
                <Skeleton className="h-3 w-16 mb-3" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
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
  const detail = mockTournamentDetails[tournament.id];
  const detailBracket = detail?.bracket ?? [];

  // Single source of truth: prefer live registrations, fall back to mock detail, then empty.
  const approvedTeams = teams.filter((t) => t.status === "Approved");
  const computedTeams =
    approvedTeams.length > 0
      ? approvedTeams.map((t) => ({
          id: t.id,
          name: t.name,
          tag: t.tag,
          captain: t.captain,
          players: t.members.map((m) => ({ ign: m.ign, role: m.role })),
        }))
      : (detail?.teams ?? []);

  const bracketNotice = formatBracketAvailability(tournament, computedTeams.length);
  const supportsBracketManager = canUseBracketManager(tournament.format, computedTeams.length);

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
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        <Panel className="clip-angle">
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 xl:grid-cols-7">
            {[
              { label: "Game", value: tournament.game },
              { label: "Status", value: tournament.status },
              { label: "Prize Pool", value: tournament.prizePool },
              { label: "Start Date", value: tournament.startDate },
              { label: "Reg. Deadline", value: tournament.registrationDeadline },
              { label: "Teams", value: `${teams.length}/${tournament.teamCap}` },
              { label: "Players", value: totalPlayers },
            ].map((cell) => (
              <div key={cell.label} className="bg-card px-6 py-6">
                <div className="text-xs font-tech uppercase tracking-wider-2 text-muted-foreground">
                  {cell.label}
                </div>
                <div className="mt-3 font-display text-2xl font-semibold tracking-wider-2">
                  {cell.value}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Tabs defaultValue="teams" className="flex flex-col gap-4">
          <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="teams"
              className="gap-2 rounded-none border-b-2 border-transparent px-6 py-3 font-tech text-xs uppercase tracking-wider-2 data-[state=active]:border-foreground data-[state=active]:bg-card data-[state=active]:shadow-none"
            >
              <Users2 className="h-4 w-4" />
              Registered Teams
              <Badge variant="secondary" className="font-tech text-[10px]">
                {teams.length}
              </Badge>
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

          <TabsContent value="teams" className="mt-0">
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
                <div>
                  <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Registrations
                  </p>
                  <h2 className="font-display text-xl font-bold tracking-wider-2">
                    Registered Teams
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
                        ? "Team cap reached"
                        : "Add a roster from Teams"
                    }
                    onClick={() => setIsAddTeamOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Teams
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
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                        Team
                      </TableHead>
                      <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                        Captain
                      </TableHead>
                      <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                        Members
                      </TableHead>
                      <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                        Registered
                      </TableHead>
                      <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-tech uppercase tracking-wider-2">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamsLoading && teams.length === 0 ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-9 w-9 shrink-0" />
                              <div className="space-y-1.5">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
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
                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                          No teams registered yet. Use Add Teams to register rosters from the Teams
                          tab.
                        </TableCell>
                      </TableRow>
                    ) : (
                      teamsPagination.paginatedItems.map((team) => (
                        <TableRow key={team.id} className="transition-colors hover:bg-secondary/40">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 place-items-center border border-border bg-secondary text-[10px] font-tech">
                                {team.tag}
                              </div>
                              <div>
                                <div className="font-display text-base tracking-wider-2">
                                  {team.name}
                                </div>
                                <div className="text-[10px] font-tech uppercase tracking-wider text-muted-foreground">
                                  {team.members.length}{" "}
                                  {team.members.length === 1 ? "player" : "players"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{team.captain}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {team.members.length} members
                          </TableCell>
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
                      ))
                    )}
                  </TableBody>
                </Table>
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
                    format={tournament.format}
                    teams={computedTeams}
                    initialBracket={detailBracket}
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

      <EditTournamentModal
        open={isEditOpen}
        tournament={tournament}
        onClose={() => setIsEditOpen(false)}
        onUpdated={patchTournament}
      />

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        title="Delete tournament?"
        description={`This permanently removes ${tournament.name}. Remove all registered teams first.${deleteTournamentError ? ` ${deleteTournamentError}` : ""}`}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={async () => {
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
        title="Remove team from tournament?"
        description={`Remove ${removingRegistration?.name ?? "this team"} from the event? The roster team stays in Teams.${removeError ? ` ${removeError}` : ""}`}
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
