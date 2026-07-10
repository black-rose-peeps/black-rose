type Tab = "overview" | "teams" | "standings" | "bracket" | "rules";

interface TournamentTabsProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  teamCount: number;
  showStandings?: boolean;
}

const BASE_TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "teams", label: "Teams" },
  { id: "bracket", label: "Bracket" },
  { id: "rules", label: "Rules" },
];

export function TournamentTabs({
  active,
  onChange,
  teamCount,
  showStandings = false,
}: TournamentTabsProps) {
  const tabs = showStandings
    ? [
        BASE_TABS[0],
        BASE_TABS[1],
        { id: "standings" as const, label: "Standings" },
        BASE_TABS[2],
        BASE_TABS[3],
      ]
    : BASE_TABS;

  return (
    <div className="sticky sticky-below-header z-20 border-b border-white/8 bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl overflow-x-auto">
        <div
          role="tablist"
          aria-label="Tournament sections"
          className="flex min-w-max items-center gap-0 px-4 sm:px-6"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              type="button"
              aria-selected={active === tab.id}
              aria-controls={`tab-panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`relative min-h-11 px-5 py-4 font-tech text-label-readable uppercase transition-colors duration-150 ${
                active === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              {tab.label}
              {tab.id === "teams" && (
                <span className="ml-2 border border-white/10 px-1.5 py-0.5 text-sm text-muted-foreground">
                  {teamCount}
                </span>
              )}
              {active === tab.id && (
                <span className="absolute inset-x-0 bottom-0 h-px bg-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export type { Tab };
