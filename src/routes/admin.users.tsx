import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { Panel, PanelHeader, StatusPill } from "@/components/admin/ui";
import { mockUsers } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <>
      <AdminTopbar title="Users" subtitle="User Management" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <Panel>
          <PanelHeader eyebrow="Accounts" title="All Users" />
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
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {u.registrationDate}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={u.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-foreground transition hover:border-foreground/60">
                          View
                        </button>
                        <button className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground">
                          Change Role
                        </button>
                        <button className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-destructive">
                          Suspend
                        </button>
                        <button className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-destructive">
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
      </div>
    </>
  );
}
