import { cn } from "@/lib/utils";

export type MemberDetailTab = "profile" | "social" | "comments";

interface MemberDetailMobileNavProps {
  activeTab: MemberDetailTab;
  onTabChange: (tab: MemberDetailTab) => void;
  commentsCount?: number;
}

export function MemberDetailMobileNav({
  activeTab,
  onTabChange,
  commentsCount,
}: MemberDetailMobileNavProps) {
  const tabs: { id: MemberDetailTab; label: string; badge?: number }[] = [
    { id: "profile", label: "Profile" },
    { id: "social", label: "Social" },
    { id: "comments", label: "Comments", badge: commentsCount },
  ];

  return (
    <nav
      aria-label="Member sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[oklch(0.06_0_0)]/95 backdrop-blur md:hidden"
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
                "touch-target flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 py-2 font-tech text-[10px] uppercase tracking-wider transition",
                active ? "bg-white/8 text-foreground" : "text-muted-foreground",
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
