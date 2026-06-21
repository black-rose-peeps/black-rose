import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitleAllClear } from "@/features/admin/constants/empty-state-titles";
import { StatusPill } from "@/features/admin/components/ui";
import type { AdminDashboardData } from "@/features/admin/services/dashboard.service";

type PendingRegistration = AdminDashboardData["pendingRegistrations"][number];

interface DashboardMobilePendingApprovalsProps {
  registrations: PendingRegistration[];
  isLoading: boolean;
}

export function DashboardMobilePendingApprovals({
  registrations,
  isLoading,
}: DashboardMobilePendingApprovalsProps) {
  const preview = registrations.slice(0, 5);

  return (
    <section className="overflow-hidden border border-white/[0.08] bg-[oklch(0.09_0_0)] md:hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
        <div>
          <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
            Awaiting Action
          </p>
          <h2 className="font-display text-lg tracking-wider-2">Pending Approvals</h2>
        </div>
        <Link
          to="/admin/participants"
          className="touch-target font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
        >
          Review
        </Link>
      </div>

      {isLoading ? (
        <ul className="divide-y divide-white/[0.06]">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-none" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 rounded-none" />
                <Skeleton className="h-3 w-24 rounded-none" />
              </div>
            </li>
          ))}
        </ul>
      ) : preview.length === 0 ? (
        <div className="px-4 py-6">
          <AdminEmptyState
            embedded
            eyebrow="Awaiting Action"
            title={<AdminEmptyTitleAllClear phrase="All caught up." />}
            description="Pending team registrations will show here when captains sign up for tournaments."
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
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {preview.map((team) => (
            <li key={team.id}>
              <Link
                to="/admin/participants"
                className="flex items-start gap-3 px-4 py-4 transition active:opacity-80"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 bg-white/[0.03] text-[10px] font-tech tracking-wider-2">
                  {team.tag}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{team.name}</p>
                  <div className="mt-1.5">
                    <StatusPill status={team.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Captain · <span className="break-words">{team.captain}</span>
                  </p>
                  <p className="mt-0.5 font-tech text-label-readable uppercase text-muted-foreground">
                    {team.registrationDate}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
