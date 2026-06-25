import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TournamentDetailTab = "teams" | "prizes" | "standings" | "bracket";

interface TournamentDetailMobileNavProps {
  activeTab: TournamentDetailTab;
  onTabChange: (tab: TournamentDetailTab) => void;
  teamsLabel: string;
  teamsCount: number;
  showStandings?: boolean;
  bracketDisabled?: boolean;
  bracketDisabledReason?: string;
}

/** Fixed bottom navigation for tournament detail on mobile. */
export function TournamentDetailMobileNav({
  activeTab,
  onTabChange,
  teamsLabel,
  teamsCount,
  showStandings = false,
  bracketDisabled = false,
  bracketDisabledReason,
}: TournamentDetailMobileNavProps) {
  const tabs: {
    id: TournamentDetailTab;
    label: string;
    badge?: ReactNode;
    disabled?: boolean;
    title?: string;
  }[] = [
    { id: "teams", label: teamsLabel, badge: teamsCount },
    { id: "prizes", label: "Prizes" },
    {
      id: "bracket",
      label: "Bracket",
      disabled: bracketDisabled,
      title: bracketDisabledReason,
    },
    ...(showStandings ? [{ id: "standings" as const, label: "Standings" }] : []),
  ];

  return (
    <nav
      aria-label="Tournament sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[oklch(0.06_0_0)]/95 backdrop-blur md:hidden"
    >
      <div
        className={cn("grid safe-bottom", showStandings ? "grid-cols-4" : "grid-cols-3")}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              title={tab.title}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "touch-target flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 font-tech text-[10px] uppercase tracking-wider transition",
                active ? "bg-white/8 text-foreground" : "text-muted-foreground",
                tab.disabled && "cursor-not-allowed opacity-40",
              )}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined ? (
                <span className="rounded-none border border-white/15 px-1.5 py-0 text-[9px]">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
