import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Panel, PanelHeader, StatusPill } from "@/features/admin/components/ui";
import { mockTeams, mockTournaments } from "@/lib/mock-data";

export function ParticipantsManagement() {
  const tournamentNameById = useMemo(
    () => Object.fromEntries(mockTournaments.map((t) => [t.id, t.name])),
    [],
  );

  return (
    <Panel>
      <PanelHeader eyebrow="All registrations" title="Team Registrations" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              <th className="px-6 py-3 text-left font-normal">Team</th>
              <th className="px-4 py-3 text-left font-normal">Tournament</th>
              <th className="px-4 py-3 text-left font-normal">Captain</th>
              <th className="px-4 py-3 text-left font-normal">Registered</th>
              <th className="px-4 py-3 text-left font-normal">Status</th>
              <th className="px-6 py-3 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockTeams.map((team) => (
              <tr key={team.id} className="transition hover:bg-secondary/40">
                <td className="px-6 py-4">
                  <div className="font-display text-base tracking-wider-2">{team.name}</div>
                  <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    {team.members?.length ?? 0} players · {team?.tag}
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">
                  <Link
                    to="/admin/tournaments/$id"
                    params={{ id: team.tournamentId }}
                    className="hover:text-foreground"
                  >
                    {tournamentNameById[team.tournamentId]}
                  </Link>
                </td>
                <td className="px-4 py-4 text-xs">{team.captain}</td>
                <td className="px-4 py-4 text-xs text-muted-foreground">{team.registrationDate}</td>
                <td className="px-4 py-4">
                  <StatusPill status={team.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="border border-foreground/40 bg-foreground/5 px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-foreground transition hover:bg-foreground/10"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-destructive"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
