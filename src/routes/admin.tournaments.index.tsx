import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import {
  GhostButton,
  Panel,
  PanelHeader,
  PrimaryButton,
  StatusPill,
} from "@/features/admin/components/ui";
import { mockTournaments } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/tournaments/")({
  component: TournamentsPage,
});

function TournamentsPage() {
  return (
    <>
      <AdminTopbar title="Tournaments" subtitle="Tournament Management" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <Panel>
          <PanelHeader
            eyebrow="Catalog"
            title="All Tournaments"
            actions={
              <>
                <GhostButton>Archive View</GhostButton>
                <PrimaryButton>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Create Tournament
                </PrimaryButton>
              </>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  <th className="px-6 py-3 text-left font-normal">Tournament</th>
                  <th className="px-4 py-3 text-left font-normal">Game</th>
                  <th className="px-4 py-3 text-left font-normal">Status</th>
                  <th className="px-4 py-3 text-left font-normal">Teams</th>
                  <th className="px-4 py-3 text-left font-normal">Reg. Deadline</th>
                  <th className="px-6 py-3 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockTournaments.map((t) => (
                  <tr key={t.id} className="transition hover:bg-secondary/40">
                    <td className="px-6 py-4">
                      <div className="flex flex-col leading-tight">
                        <span className="font-display text-base tracking-wider-2">{t.name}</span>
                        <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                          {t.prizePool} · Starts {t.startDate}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">{t.game}</td>
                    <td className="px-4 py-4">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <span className="text-foreground">{t.teamsRegistered}</span>
                      <span className="text-muted-foreground"> / {t.teamCap}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {t.registrationDeadline}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to="/admin/tournaments/$id"
                          params={{ id: t.id }}
                          className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-foreground transition hover:border-foreground/60"
                        >
                          View
                        </Link>
                        <button className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground">
                          Edit
                        </button>
                        <button className="border border-border bg-secondary px-3 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-destructive">
                          Delete
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
