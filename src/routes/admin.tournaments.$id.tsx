import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { GhostButton, Panel, PanelHeader, PrimaryButton, StatusPill } from "@/components/admin/ui";
import { mockTeams, mockTournaments, type MockTeam } from "@/lib/mock-data";
import { ArrowLeft, X } from "lucide-react";

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

function TournamentDetailPage() {
  const { tournament } = Route.useLoaderData();
  const teams = mockTeams.filter((t) => t.tournamentId === tournament.id);
  const [openTeam, setOpenTeam] = useState<MockTeam | null>(null);

  const totalPlayers = teams.reduce((acc, t) => acc + t.members.length, 0);

  return (
    <>
      <AdminTopbar title={tournament.name} subtitle="Tournament Operations" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <Link
          to="/admin/tournaments"
          className="inline-flex w-fit items-center gap-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Tournaments
        </Link>

        {/* Summary */}
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
              <div key={cell.label} className="bg-card px-5 py-5">
                <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  {cell.label}
                </div>
                <div className="mt-2 font-display text-xl tracking-wider-2">{cell.value}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Teams */}
        <Panel>
          <PanelHeader
            eyebrow="Registrations"
            title="Registered Teams"
            actions={
              <>
                <GhostButton>Export CSV</GhostButton>
                <PrimaryButton>Publish Bracket</PrimaryButton>
              </>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  <th className="px-6 py-3 text-left font-normal">Team</th>
                  <th className="px-4 py-3 text-left font-normal">Captain</th>
                  <th className="px-4 py-3 text-left font-normal">Members</th>
                  <th className="px-4 py-3 text-left font-normal">Registered</th>
                  <th className="px-4 py-3 text-left font-normal">Status</th>
                  <th className="px-6 py-3 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teams.map((team) => (
                  <tr key={team.id} className="transition hover:bg-secondary/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center border border-border bg-secondary text-[10px] font-tech tracking-wider-2 text-foreground">
                          {team.tag}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="font-display text-base tracking-wider-2">
                            {team.name}
                          </span>
                          <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                            ID {team.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">{team.captain}</td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {team.members.length}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {team.registrationDate}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={team.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setOpenTeam(team)}
                          className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-foreground transition hover:border-foreground/60"
                        >
                          View
                        </button>
                        <button className="border border-foreground/40 bg-foreground/5 px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-foreground transition hover:bg-foreground/10">
                          Approve
                        </button>
                        <button className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-destructive">
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
                      className="px-6 py-10 text-center text-xs text-muted-foreground"
                    >
                      No teams registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {openTeam && <TeamModal team={openTeam} onClose={() => setOpenTeam(null)} />}
    </>
  );
}

function TeamModal({ team, onClose }: { team: MockTeam; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-10">
      <div className="relative w-full max-w-2xl border border-border bg-card">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center border border-border bg-secondary text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center border border-border bg-secondary font-display text-xl tracking-wider-2">
              {team.tag}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Team Profile
              </span>
              <h3 className="font-display text-2xl tracking-display">{team.name}</h3>
              <span className="mt-1 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Captain: {team.captain} · Registered {team.registrationDate}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-3 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            <span className="h-px w-8 bg-border" />
            Roster
          </div>
          <div className="divide-y divide-border border border-border">
            {team.members.map((p) => (
              <div key={p.ign} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex flex-col leading-tight">
                  <span className="font-medium">{p.ign}</span>
                  <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    {p.role}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{p.discord}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 mb-3 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            <span className="h-px w-8 bg-border" />
            Tournament History
          </div>
          {team.history.length ? (
            <ul className="space-y-2 text-xs text-muted-foreground">
              {team.history.map((h) => (
                <li key={h} className="border border-border bg-secondary px-3 py-2">
                  {h}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No prior tournaments.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <button className="border border-border bg-secondary px-4 py-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-destructive">
            Remove Team
          </button>
          <PrimaryButton>Approve Team</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
