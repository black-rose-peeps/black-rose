import { cn } from "@/lib/utils";

export type BracketManagerTab = "seeding" | "bracket" | "validation";

interface BracketManagerSubTabsProps {
  activeTab: BracketManagerTab;
  onTabChange: (tab: BracketManagerTab) => void;
  bracketGenerated: boolean;
  className?: string;
}

const TAB_LABELS: Record<
  BracketManagerTab,
  { short: string; full: (bracketGenerated: boolean) => string }
> = {
  seeding: {
    short: "Seeding",
    full: () => "Team Seeding",
  },
  bracket: {
    short: "Matches",
    full: (bracketGenerated) => (bracketGenerated ? "Manage Bracket" : "Bracket Preview"),
  },
  validation: {
    short: "Validate",
    full: () => "Validation",
  },
};

export function BracketManagerSubTabs({
  activeTab,
  onTabChange,
  bracketGenerated,
  className,
}: BracketManagerSubTabsProps) {
  const tabs: BracketManagerTab[] = ["seeding", "bracket", "validation"];

  return (
    <div
      className={cn(
        "flex overflow-x-auto border-b border-white/6 bg-[oklch(0.06_0_0)] px-2 sm:px-6",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab;
        const labels = TAB_LABELS[tab];
        const previewLabel = tab === "bracket" && !bracketGenerated ? "Preview" : labels.short;

        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cn(
              "touch-target shrink-0 border-b-2 px-3 py-3 font-tech text-[10px] uppercase tracking-[0.18em] transition-colors sm:px-5",
              active
                ? "border-white text-white"
                : "border-transparent text-white/40 hover:text-white/65",
            )}
          >
            <span className="sm:hidden">{previewLabel}</span>
            <span className="hidden sm:inline">{labels.full(bracketGenerated)}</span>
          </button>
        );
      })}
    </div>
  );
}
