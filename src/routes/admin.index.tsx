import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Swords,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitle, AdminEmptyTitleAllClear } from "@/features/admin/constants/empty-state-titles";
import { Panel, PanelHeader, StatCard, StatusPill } from "@/features/admin/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseClient } from "@/lib/supabase";
import { createAdminSilentRefetch } from "@/lib/admin-realtime-refetch";
import {
  fetchAdminDashboard,
  type AdminDashboardData,
} from "@/features/admin/services/dashboard.service";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const result = await fetchAdminDashboard();
      setData(result);
      setError(null);
    } catch (err) {
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      }
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
    const debouncedRefetch = createAdminSilentRefetch(refetch);

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("admin-dashboard-tournaments")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => {
        debouncedRefetch({ silent: true });
      })
      .subscribe();

    function handleFocus() {
      debouncedRefetch({ silent: true });
    }
    window.addEventListener("focus", handleFocus);

    return () => {
      debouncedRefetch.cancel();
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch]);

  return { data, isLoading, error };
}

function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboard();

  const stats = data?.stats ?? {
    totalMembers: 0,
    totalTeams: 0,
    activeTournaments: 0,
    pendingRegistrations: 0,
    completedTournaments: 0,
  };
  const activeTournaments = data?.activeTournaments ?? [];
  const pendingRegistrations = data?.pendingRegistrations ?? [];

  return (
    <>
      <AdminTopbar title="Dashboard" subtitle="Operations Overview" />
      <div className="flex flex-1 flex-col gap-8 px-6 py-8 lg:px-10">
        {error && (
          <div className="border border-red-400/30 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="relative overflow-hidden border border-white/[0.08] bg-[oklch(0.08_0_0)] px-6 py-8 lg:px-8">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-35" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-white/[0.04] to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              <span className="h-px w-8 bg-border" />
              Black Rose Operations
            </div>
            <h1 className="mt-3 font-display text-3xl tracking-wider text-foreground sm:text-4xl">
              Command Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Monitor members, rosters, and live events from one place. Open a tournament to manage
              brackets, registrations, and prize distribution.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Members"
            value={isLoading ? "—" : stats.totalMembers.toLocaleString()}
            change="Registered accounts"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Total Teams"
            value={isLoading ? "—" : stats.totalTeams}
            change="Active rosters"
            icon={<UsersRound className="h-4 w-4" />}
          />
          <StatCard
            title="Active Events"
            value={isLoading ? "—" : stats.activeTournaments}
            change="Live or open registration"
            icon={<Swords className="h-4 w-4" />}
          />
          <StatCard
            title="Pending Review"
            value={isLoading ? "—" : stats.pendingRegistrations}
            change="Awaiting approval"
            icon={<CalendarClock className="h-4 w-4" />}
          />
          <StatCard
            title="Completed"
            value={isLoading ? "—" : stats.completedTournaments}
            change="Finished tournaments"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel className="clip-angle overflow-hidden border-white/[0.08] bg-[oklch(0.09_0_0)] xl:col-span-2">
            <PanelHeader
              eyebrow="Live Operations"
              title="Active Tournaments"
              actions={
                <Link
                  to="/admin/tournaments"
                  className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
                >
                  View All →
                </Link>
              }
            />
            <div className="divide-y divide-white/[0.06]">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-5">
                    <Skeleton className="h-10 w-10 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))
              ) : (
                activeTournaments.map((t) => (
                  <Link
                    key={t.id}
                    to="/admin/tournaments/$id"
                    params={{ id: t.id }}
                    className="group flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-white/[0.03]"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center border border-white/10 bg-white/[0.04] transition group-hover:border-white/20">
                        <Trophy className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      </div>
                      <div className="min-w-0 flex flex-col leading-tight">
                        <span className="truncate font-title text-lg">
                          {t.name}
                        </span>
                        <span className="mt-1 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                          {t.game} · {t.prizePool} · {t.teamsRegistered}/{t.teamCap} slots
                        </span>
                      </div>
                    </div>
                    <StatusPill status={t.status} />
                  </Link>
                ))
              )}
              {!isLoading && activeTournaments.length === 0 && (
                <div className="px-6 py-8">
                  <AdminEmptyState
                    embedded
                    eyebrow="Live Operations"
                    title={<AdminEmptyTitle noun="active events" />}
                    description="Events with open registration or live brackets appear here. Create a tournament or move a draft into registration to populate this list."
                    actions={
                      <Link
                        to="/admin/tournaments"
                        className="font-tech text-ui-readable uppercase underline-offset-4 hover:underline"
                      >
                        Go to Tournaments
                      </Link>
                    }
                  />
                </div>
              )}
            </div>
          </Panel>

          <Panel className="clip-angle overflow-hidden border-white/[0.08] bg-[oklch(0.09_0_0)]">
            <PanelHeader
              eyebrow="Awaiting Action"
              title="Pending Approvals"
              actions={
                <Link
                  to="/admin/participants"
                  className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
                >
                  Review →
                </Link>
              }
            />
            <div className="divide-y divide-white/[0.06]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 shrink-0" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))
              ) : (
                pendingRegistrations.slice(0, 5).map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between gap-4 px-6 py-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 bg-white/[0.03] text-[10px] font-tech">
                        {team.tag}
                      </div>
                      <div className="min-w-0 flex flex-col leading-tight">
                        <span className="truncate text-sm font-medium">{team.name}</span>
                        <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                          {team.captain} · {team.registrationDate}
                        </span>
                      </div>
                    </div>
                    <StatusPill status={team.status} />
                  </div>
                ))
              )}
              {!isLoading && pendingRegistrations.length === 0 && (
                <div className="px-6 py-8">
                  <AdminEmptyState
                    embedded
                    eyebrow="Awaiting Action"
                    title={<AdminEmptyTitleAllClear phrase="All caught up." />}
                    description="Pending team registrations will show here when captains sign up for tournaments. Approve or reject entries before brackets are generated."
                    actions={
                      <Link
                        to="/admin/participants"
                        className="font-tech text-ui-readable uppercase underline-offset-4 hover:underline"
                      >
                        View Participants
                      </Link>
                    }
                  />
                </div>
              )}
            </div>
          </Panel>
        </section>
      </div>
    </>
  );
}
