import { Panel, PanelHeader } from "@/features/admin/components/ui";
import { mockTeams } from "@/lib/mock-data";

export function TeamsManagement() {
  return (
    <Panel>
      <PanelHeader eyebrow="All teams" title="Roster Index" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              <th className="px-6 py-3 text-left font-normal">Team</th>
              <th className="px-4 py-3 text-left font-normal">Captain</th>
              <th className="px-4 py-3 text-left font-normal">Members</th>
              <th className="px-4 py-3 text-left font-normal">Tournaments</th>
              <th className="px-6 py-3 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockTeams.map((team) => (
              <tr key={team.id} className="transition hover:bg-secondary/40">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center border border-border bg-secondary text-[10px] font-tech tracking-wider-2">
                      {team.tag}
                    </div>
                    <div className="font-display text-base tracking-wider-2">{team.name}</div>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs">{team.captain}</td>
                <td className="px-4 py-4 text-xs text-muted-foreground">{team.members.length}</td>
                <td className="px-4 py-4 text-xs text-muted-foreground">
                  {team.history.length + 1}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-foreground transition hover:border-foreground/60">
                      View Team
                    </button>
                    <button className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-destructive">
                      Remove
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
