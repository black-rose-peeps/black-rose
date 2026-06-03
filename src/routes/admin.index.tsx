import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { Panel, PanelHeader, StatCard, StatusPill } from "@/features/admin/components/ui";
import { mockOverview, mockTeams, mockTournaments } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const pending = mockTeams.filter((t) => t.status === "Pending");
  const active = mockTournaments.filter(
    (t) => t.status === "Live" || t.status === "Registration Open",
  );

  return (
    <>
      <AdminTopbar title="Dashboard" subtitle="Operations Overview" />
      <div className="flex flex-1 flex-col gap-8 px-6 py-8 lg:px-10">
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatCard
            title="Total Users"
            value={mockOverview.totalUsers.toLocaleString()}
            change="+42 this week"
          />
          <StatCard title="Total Teams" value={mockOverview.totalTeams} change="+11 this week" />
          <StatCard
            title="Active Tournaments"
            value={mockOverview.activeTournaments}
            change="2 in registration"
          />
          <StatCard
            title="Pending Registrations"
            value={mockOverview.pendingRegistrations}
            change="Awaiting review"
          />
          <StatCard title="Completed" value={mockOverview.completedTournaments} change="All-time" />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <PanelHeader
              eyebrow="Live Operations"
              title="Active Tournaments"
              actions={
                <Link
                  to="/admin/tournaments"
                  className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground hover:text-foreground"
                >
                  View All →
                </Link>
              }
            />
            <div className="divide-y divide-border">
              {active.map((t) => (
                <Link
                  key={t.id}
                  to="/admin/tournaments/$id"
                  params={{ id: t.id }}
                  className="flex items-center justify-between px-6 py-4 transition hover:bg-secondary/50"
                >
                  <div className="flex flex-col leading-tight">
                    <span className="font-display text-lg tracking-wider-2">{t.name}</span>
                    <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                      {t.game} · {t.prizePool} · {t.teamsRegistered}/{t.teamCap} teams
                    </span>
                  </div>
                  <StatusPill status={t.status} />
                </Link>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="Awaiting Action"
              title="Pending Approvals"
              actions={
                <Link
                  to="/admin/participants"
                  className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground hover:text-foreground"
                >
                  Review →
                </Link>
              }
            />
            <div className="divide-y divide-border">
              {pending.slice(0, 5).map((team) => (
                <div key={team.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-medium">{team.name}</span>
                    <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                      {team.captain} · {team.registrationDate}
                    </span>
                  </div>
                  <StatusPill status={team.status} />
                </div>
              ))}
              {pending.length === 0 && (
                <div className="px-6 py-8 text-center text-xs text-muted-foreground">
                  No pending registrations.
                </div>
              )}
            </div>
          </Panel>
        </section>
      </div>
    </>
  );
}
