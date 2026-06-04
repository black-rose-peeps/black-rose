import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trophy, Users2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BracketManager } from "@/features/admin/features/tournament/components/BracketManager";
import { TeamModal } from "@/features/admin/components/TeamModal";
import { AddTeamToTournamentDialog } from "@/features/admin/features/tournaments/components/AddTeamToTournamentDialog";
import { useTournamentRegistrations } from "@/features/admin/features/tournaments/hooks";
import { fetchTournamentById } from "@/features/admin/features/tournaments/services/tournaments.service";
import {
  formatBracketAvailability,
  supportsBracketManager as canUseBracketManager,
} from "@/features/admin/features/tournaments/utils";
import { registrationStatusVariant } from "@/features/admin/features/participants/utils";
import { usePagination } from "@/features/admin/hooks/usePagination";
import type { MockTeam } from "@/lib/mock-data";
import { mockTournamentDetails } from "@/lib/mock-tournament-details";

export const Route = createFileRoute("/admin/tournaments/$id")({
  loader: async ({ params }) => {
    const tournament = await fetchTournamentById(params.id);
    if (!tournament) throw notFound();
    return { tournament };
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

function TournamentDetailPage() {
  const { tournament } = Route.useLoaderData();
  const {
    registrations: teams,
    isLoading: teamsLoading,
    error: teamsError,
    prependRegistration,
  } = useTournamentRegistrations(tournament.id);
  const teamsPagination = usePagination(teams);
  const [openTeam, setOpenTeam] = useState<MockTeam | null>(null);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);

  const totalPlayers = teams.reduce((acc, t) => acc + t.members.length, 0);
  const detail = mockTournamentDetails[tournament.id];
  const detailBracket = detail?.bracket ?? [];

  // Single source of truth: prefer live registrations, fall back to mock detail, then empty.
  const computedTeams =
    teams.length > 0
      ? teams.map((t) => ({
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
                <div className="flex flex-wrap gap-2">
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
                    Add Team
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
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                          Loading teams…
                        </TableCell>
                      </TableRow>
                    ) : teams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                          No teams registered yet. Use Add Team to register rosters from the Teams
                          tab.
                        </TableCell>
                      </TableRow>
                    ) : (
                      teamsPagination.paginatedItems.map((team) => (
                        <TableRow key={team.id}>
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
                                  {team.id}
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
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="font-tech text-[10px] uppercase tracking-wider"
                                onClick={() => setOpenTeam(team)}
                              >
                                View
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
        onAdded={(registration) => {
          prependRegistration(registration);
          teamsPagination.setPage(1);
        }}
      />
    </>
  );
}
