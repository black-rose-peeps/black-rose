import { Link } from "@tanstack/react-router";
import { Crown, Gamepad2, LayoutDashboard, Swords, Users2 } from "lucide-react";

const itemClass =
  "group flex min-h-16 min-w-0 items-center gap-3 border px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-5";

/** Ordinary links support Tab/Enter, open-in-new-tab, and browser history. */
export function HubNavigation({
  hub,
  view,
}: {
  hub: "tournaments" | "dashboard";
  view: "browse" | "champions" | "overview" | "teams" | "games";
}) {
  const tournamentHub = hub === "tournaments";
  const items = tournamentHub
    ? ([
        {
          view: "browse",
          label: "Tournaments",
          description: "Find your next competition",
          icon: Swords,
        },
        {
          view: "champions",
          label: "Champions",
          description: "Explore the winning rosters",
          icon: Crown,
        },
      ] as const)
    : ([
        {
          view: "overview",
          label: "Overview",
          description: "Your identity and activity",
          icon: LayoutDashboard,
        },
        {
          view: "games",
          label: "My Games",
          description: "Game profiles and memberships",
          icon: Gamepad2,
        },
        {
          view: "teams",
          label: "Teams",
          description: "Rosters, invites and creation",
          icon: Users2,
        },
      ] as const);

  return (
    <nav
      aria-label={tournamentHub ? "Tournament views" : "Dashboard views"}
      className={`my-8 grid ${tournamentHub ? "grid-cols-2" : "grid-cols-3"} gap-2 sm:gap-3`}
    >
      {items.map(({ view: target, label, description, icon: Icon }) => {
        const active = view === target;
        return (
          <Link
            key={target}
            to={tournamentHub ? "/tournaments" : "/dashboard"}
            activeOptions={{ exact: true }}
            search={
              target === "champions"
                ? { view: "champions" }
                : target === "teams"
                  ? { view: "teams" }
                  : target === "games"
                    ? { view: "games" }
                    : {}
            }
            aria-current={active ? "page" : undefined}
            className={`${itemClass} ${active ? "border-white/40 bg-white/10 text-foreground" : "border-white/10 bg-white/2 text-muted-foreground hover:border-white/25 hover:bg-white/5 hover:text-foreground"}`}
          >
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="min-w-0">
              <span className="block font-tech text-sm font-semibold sm:text-base">{label}</span>
              <span className="mt-0.5 hidden text-xs leading-5 sm:block">{description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
