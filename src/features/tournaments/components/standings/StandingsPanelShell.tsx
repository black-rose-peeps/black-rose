import type { ReactNode } from "react";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitle } from "@/features/admin/constants/empty-state-titles";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import {
  FeatureLoadingState,
  FeaturePanelShell,
  type FeaturePanelStat,
} from "@/features/shared/components/FeaturePanelShell";

interface StandingsPanelShellProps {
  eyebrow: string;
  subtitle: string;
  stats?: FeaturePanelStat[];
  children: ReactNode;
  className?: string;
}

export function StandingsPanelShell({
  eyebrow,
  subtitle,
  stats = [],
  children,
  className,
}: StandingsPanelShellProps) {
  return (
    <FeaturePanelShell
      eyebrow={eyebrow}
      title="Standings"
      subtitle={subtitle}
      stats={stats}
      className={className}
    >
      {children}
    </FeaturePanelShell>
  );
}

interface StandingsEmptyStateProps {
  eyebrow: string;
  admin?: boolean;
  message?: string;
  isDoubleElim?: boolean;
}

export function StandingsEmptyState({
  eyebrow,
  admin = false,
  message,
  isDoubleElim = false,
}: StandingsEmptyStateProps) {
  const shellSubtitle = admin
    ? "Win-loss records update after the bracket is published and matches are recorded."
    : isDoubleElim
      ? "Double elimination records appear once the bracket is live."
      : "Elimination records appear once the bracket is live.";

  const description =
    message ??
    (admin
      ? "Publish the bracket from Bracket Management after seeding is complete. Standings will populate automatically as match results are entered."
      : "Check back once the bracket is published and the tournament is underway. Records update live as teams win and lose.");

  if (admin) {
    return (
      <StandingsPanelShell eyebrow={eyebrow} subtitle={shellSubtitle}>
        <div className="bg-[oklch(0.06_0_0)] px-4 py-4 sm:px-6 sm:py-5">
          <AdminEmptyState
            embedded
            eyebrow="Awaiting bracket"
            title={<AdminEmptyTitle noun="standings" />}
            description={description}
          />
        </div>
      </StandingsPanelShell>
    );
  }

  return (
    <ArenaEmptyState
      compact
      eyebrow="Standings Pending"
      title={
        <>
          No records <span className="text-stroke">yet.</span>
        </>
      }
      description={description}
    />
  );
}

export function StandingsLoadingState() {
  return <FeatureLoadingState />;
}
