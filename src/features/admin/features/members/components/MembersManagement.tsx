import { Panel, PanelHeader, StatusPill } from "@/features/admin/components/ui";
import { mockUsers } from "@/lib/mock-data";

export function MembersManagement() {
  return (
    <Panel>
      <PanelHeader eyebrow="Accounts" title="All Members" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              <th className="px-6 py-3 text-left font-normal">Username</th>
              <th className="px-4 py-3 text-left font-normal">Email</th>
              <th className="px-4 py-3 text-left font-normal">Role</th>
              <th className="px-4 py-3 text-left font-normal">Registered</th>
              <th className="px-4 py-3 text-left font-normal">Status</th>
              <th className="px-6 py-3 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockUsers.map((u) => (
              <tr key={u.id} className="transition hover:bg-secondary/40">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center bg-foreground text-[10px] font-tech tracking-wider-2 text-background">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium">{u.username}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">{u.email}</td>
                <td className="px-4 py-4 text-[10px] font-tech uppercase tracking-wider-2">
                  {u.role}
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">{u.registrationDate}</td>
                <td className="px-4 py-4">
                  <StatusPill status={u.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Not implemented"
                      className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Not implemented"
                      className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      Change Role
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Not implemented"
                      className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      Suspend
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Not implemented"
                      className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      Ban
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
