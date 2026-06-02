import { Link, useRouterState } from "@tanstack/react-router";
import { Emblem } from "@/components/site/Emblem";
import {
  LayoutGrid,
  Trophy,
  Users2,
  Shield,
  UserCog,
  Megaphone,
  Settings,
  LogOut,
} from "lucide-react";

const items: { label: string; to: string; icon: typeof LayoutGrid; exact?: boolean }[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutGrid, exact: true },
  { label: "Tournaments", to: "/admin/tournaments", icon: Trophy },
  { label: "Participants", to: "/admin/participants", icon: Users2 },
  { label: "Teams", to: "/admin/teams", icon: Shield },
  { label: "Users", to: "/admin/users", icon: UserCog },
  { label: "Announcements", to: "/admin/announcements", icon: Megaphone },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-black lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <Emblem className="h-7 w-7" />
        <div className="flex flex-col leading-none">
          <span className="font-display text-base tracking-wider-2">BLACK ROSE</span>
          <span className="mt-1 text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Operations Console
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
        {items.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as "/admin"}
              className={`group relative flex items-center gap-3 border border-transparent px-3 py-2.5 text-xs font-tech uppercase tracking-wider-2 transition ${
                active
                  ? "border-border bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {active && <span className="absolute left-0 top-0 h-full w-[2px] bg-foreground" />}
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <Link
          to="/login"
          className="flex items-center gap-3 px-3 py-2.5 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Link>
      </div>
    </aside>
  );
}
