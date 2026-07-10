import {
  CalendarClock,
  CheckCircle2,
  Swords,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { AdminDashboardStats } from "@/features/admin/services/dashboard.service";

interface DashboardMobileStatsProps {
  stats: AdminDashboardStats;
  isLoading: boolean;
}

interface StatTile {
  key: keyof AdminDashboardStats;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  format: (value: number) => string;
}

const STAT_TILES: StatTile[] = [
  {
    key: "totalMembers",
    title: "Members",
    subtitle: "Registered",
    icon: Users,
    format: (v) => v.toLocaleString(),
  },
  {
    key: "verifiedMembers",
    title: "Verified",
    subtitle: "ROSE confirmed",
    icon: CheckCircle2,
    format: (v) => v.toLocaleString(),
  },
  {
    key: "totalTeams",
    title: "Teams",
    subtitle: "Active rosters",
    icon: UsersRound,
    format: (v) => String(v),
  },
  {
    key: "activeTournaments",
    title: "Events",
    subtitle: "Live / open reg",
    icon: Swords,
    format: (v) => String(v),
  },
  {
    key: "pendingRegistrations",
    title: "Pending",
    subtitle: "Needs review",
    icon: CalendarClock,
    format: (v) => String(v),
  },
];

/** Horizontally scrollable stat strip for mobile dashboard. */
export function DashboardMobileStats({ stats, isLoading }: DashboardMobileStatsProps) {
  return (
    <section className="md:hidden">
      <p className="mb-2 px-4 font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
        Overview
      </p>
      <div className="custom-scrollbar overflow-x-auto px-4">
        <div className="flex w-max gap-3 pb-1">
          {STAT_TILES.map((tile) => {
            const Icon = tile.icon;
            const value = stats[tile.key];

            return (
              <div
                key={tile.key}
                className="relative w-[8.75rem] shrink-0 overflow-hidden border border-white/[0.08] bg-[oklch(0.09_0_0)] p-3.5"
              >
                <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-tech text-[9px] uppercase tracking-wider text-muted-foreground">
                      {tile.title}
                    </p>
                    <div className="grid h-8 w-8 shrink-0 place-items-center border border-white/10 bg-white/[0.04] text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <p className="mt-2 font-display text-2xl font-semibold tracking-wider text-foreground">
                    {isLoading ? "—" : tile.format(value)}
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground/90">
                    {tile.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
