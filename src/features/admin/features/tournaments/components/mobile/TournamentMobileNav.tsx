import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TournamentDetailTab = "teams" | "prizes" | "bracket";

interface TournamentDetailMobileNavProps {
  activeTab: TournamentDetailTab;
  onTabChange: (tab: TournamentDetailTab) => void;
  teamsLabel: string;
  teamsCount: number;
  bracketDisabled?: boolean;
  bracketDisabledReason?: string;
}

/** Fixed bottom navigation for tournament detail on mobile. */
export function TournamentDetailMobileNav({
  activeTab,
  onTabChange,
  teamsLabel,
  teamsCount,
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
  ];

  return (
    <nav
      aria-label="Tournament sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[oklch(0.06_0_0)]/95 backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-3 safe-bottom">
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
                "touch-target flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 py-2 font-tech text-[10px] uppercase tracking-wider transition",
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

export type BracketManagerTab = "seeding" | "bracket" | "validation";

interface BracketManagerMobileNavProps {
  activeTab: BracketManagerTab;
  onTabChange: (tab: BracketManagerTab) => void;
  bracketGenerated: boolean;
}

/** Fixed bottom navigation inside Bracket Manager on mobile. */
export function BracketManagerMobileNav({
  activeTab,
  onTabChange,
  bracketGenerated,
}: BracketManagerMobileNavProps) {
  const tabs: { id: BracketManagerTab; label: string }[] = [
    { id: "seeding", label: "Seeding" },
    { id: "bracket", label: bracketGenerated ? "Matches" : "Preview" },
    { id: "validation", label: "Validate" },
  ];

  return (
    <nav
      aria-label="Bracket manager sections"
      className="sticky bottom-0 z-20 border-t border-white/10 bg-[oklch(0.07_0_0)]/95 backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-3 safe-bottom">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "touch-target flex min-h-12 flex-col items-center justify-center px-2 py-2 font-tech text-[10px] uppercase tracking-wider transition",
                active ? "bg-white/8 text-foreground" : "text-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
