import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Users2, Trophy } from "lucide-react";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { Panel, PanelHeader, PrimaryButton, StatusPill } from "@/features/admin/components/ui";
import { BracketManager } from "@/features/admin/features/tournament/components/BracketManager";
import { TeamModal } from "@/features/admin/components/TeamModal";
import { mockTeams, mockTournaments, type MockTeam } from "@/lib/mock-data";
import { mockTournamentDetails } from "@/lib/mock-tournament-details";

export const Route = createFileRoute("/admin/tournaments/$id")({
  loader: ({ params }) => {
    const tournament = mockTournaments.find((t) => t.id === params.id);
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

type Tab = "teams" | "bracket";

function TournamentDetailPage() {
  const { tournament } = Route.useLoaderData();
  const teams = mockTeams.filter((t) => t.tournamentId === tournament.id);
  const [openTeam, setOpenTeam] = useState<MockTeam | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("teams");

  const totalPlayers = teams.reduce((acc, t) => acc + t.members.length, 0);

  // Pull rich detail (bracket + registered teams) if available
  const detail = mockTournamentDetails[tournament.id];
  const detailBracket = detail?.bracket ?? [];

  // Team list for bracket — prefer rich detail, fall back to registered mock teams
  const detailTeams =
    detail?.teams ??
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      tag: t.tag,
      captain: t.captain,
      players: t.members.map((m) => ({ ign: m.ign, role: m.role })),
    }));

  const supportsBracketManager =
    tournament.format === "Single Elimination" && detailTeams.length === 16;

  return (
    <>
      <AdminTopbar title={tournament.name} subtitle="Tournament Operations" />

      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <Link
          to="/admin/tournaments"
          className="inline-flex w-fit items-center gap-2 text-sm-readable font-tech font-medium uppercase tracking-wider-2 text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tournaments
        </Link>

        {/* Summary strip */}
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
                <div className="text-xs-readable font-tech font-medium uppercase tracking-wider-2 text-muted-foreground">
                  {cell.label}
                </div>
                <div className="mt-3 font-display text-2xl font-semibold tracking-wider-2">
                  {cell.value}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Tab bar */}
        <div className="flex border-b border-border">
          <TabButton
            active={activeTab === "teams"}
            icon={<Users2 className="h-4 w-4" />}
            label="Registered Teams"
            count={teams.length}
            onClick={() => setActiveTab("teams")}
          />
          <TabButton
            active={activeTab === "bracket"}
            icon={<Trophy className="h-4 w-4" />}
            label="Bracket Management"
            disabled={!supportsBracketManager}
            title={
              supportsBracketManager
                ? undefined
                : "Only available for 16-team single-elimination tournaments"
            }
            onClick={() => supportsBracketManager && setActiveTab("bracket")}
          />
        </div>

        {/* ── Teams tab ──────────────────────────────────────── */}
        {activeTab === "teams" && (
          <Panel>
            <PanelHeader
              eyebrow="Registrations"
              title="Registered Teams"
              actions={
                <>
                  {/* <GhostButton>Export CSV</GhostButton> */}
                  <PrimaryButton onClick={() => setActiveTab("bracket")}>
                    Manage Bracket
                  </PrimaryButton>
                </>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-xs-readable font-tech font-medium uppercase tracking-wider-2 text-muted-foreground">
                    <th className="px-6 py-4 text-left font-normal">Team</th>
                    <th className="px-4 py-4 text-left font-normal">Captain</th>
                    <th className="px-4 py-4 text-left font-normal">Members</th>
                    <th className="px-4 py-4 text-left font-normal">Registered</th>
                    <th className="px-4 py-4 text-left font-normal">Status</th>
                    <th className="px-6 py-4 text-right font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teams.map((team) => (
                    <tr key={team.id} className="transition hover:bg-secondary/40">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="grid h-10 w-10 place-items-center border border-border bg-secondary text-xs-readable font-tech font-medium tracking-wider-2 text-foreground">
                            {team.tag}
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="font-display text-lg font-semibold tracking-wider-2">
                              {team.name}
                            </span>
                            <span className="text-xs-readable font-tech font-medium uppercase tracking-wider-2 text-muted-foreground">
                              ID {team.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm-readable font-medium">{team.captain}</td>
                      <td className="px-4 py-5 text-sm-readable text-muted-foreground">
                        {team.members.length} members
                      </td>
                      <td className="px-4 py-5 text-sm-readable text-muted-foreground">
                        {team.registrationDate}
                      </td>
                      <td className="px-4 py-5">
                        <StatusPill status={team.status} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setOpenTeam(team)}
                            className="rounded border border-border bg-secondary px-4 py-2 text-xs-readable font-tech font-medium uppercase tracking-wider-2 text-foreground transition hover:border-foreground/60 hover:bg-secondary/80"
                          >
                            View Details
                          </button>
                          <button className="rounded border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs-readable font-tech font-medium uppercase tracking-wider-2 text-emerald-400 transition hover:bg-emerald-400/20">
                            Approve
                          </button>
                          <button className="rounded border border-border bg-secondary px-4 py-2 text-xs-readable font-tech font-medium uppercase tracking-wider-2 text-muted-foreground transition hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive">
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-base-readable text-muted-foreground"
                      >
                        No teams registered yet. Check back later or promote the tournament.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ── Bracket tab ────────────────────────────────────── */}
        {activeTab === "bracket" && (
          <Panel>
            <PanelHeader eyebrow="Admin" title="Bracket Management" />
            <div className="px-6 py-6">
              {supportsBracketManager ? (
                <BracketManager
                  tournamentId={tournament.id}
                  tournamentName={tournament.name}
                  format={tournament.format}
                  teams={detailTeams}
                  initialBracket={detailBracket}
                />
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-base-readable">
                    Bracket management is only available for 16-team single-elimination
                    tournaments.
                  </p>
                  <p className="mt-2 text-sm">
                    This tournament uses {tournament.format} with {detailTeams.length} registered
                    teams.
                  </p>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>

      {openTeam && <TeamModal team={openTeam} onClose={() => setOpenTeam(null)} />}
    </>
  );
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function TabButton({
  active,
  icon,
  label,
  count,
  disabled,
  title,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`relative flex items-center gap-3 px-6 py-4 text-sm-readable font-tech font-medium uppercase tracking-wider-2 transition ${
        active
          ? "text-foreground bg-card"
          : disabled
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground/80 hover:bg-secondary/50"
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className="ml-2 rounded border border-white/20 bg-white/10 px-2 py-1 text-xs-readable font-medium text-muted-foreground">
          {count}
        </span>
      )}
      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />}
    </button>
  );
}
