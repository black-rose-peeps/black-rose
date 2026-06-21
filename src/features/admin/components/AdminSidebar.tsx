import React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCheck,
  Shield,
  LogOut,
  ScrollText,
} from "lucide-react";
import { Emblem } from "@/features/shared/components/Emblem";
import { logoutAdminConsole } from "@/features/admin/auth/admin-session";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Tournaments",
    href: "/admin/tournaments",
    icon: Trophy,
  },
  {
    name: "Members",
    href: "/admin/users",
    icon: Shield,
  },
  {
    name: "Teams",
    href: "/admin/teams",
    icon: Users,
  },
  {
    name: "Participants",
    href: "/admin/participants",
    icon: UserCheck,
  },
  {
    name: "Audit Log",
    href: "/admin/audit-log",
    icon: ScrollText,
  },

  // {
  //   name: "Announcements",
  //   href: "/admin/announcements",
  //   icon: Megaphone,
  // },

  // {
  //   name: "Settings",
  //   href: "/admin/settings",
  //   icon: Settings,
  // },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  function handleLogout() {
    logoutAdminConsole();
    navigate({ to: "/login", search: { console: "1" } });
  }

  return (
    <div className="flex w-64 flex-col border-r border-white/8 bg-[oklch(0.06_0_0)] backdrop-blur">
      <div className="relative overflow-hidden border-b border-white/6 p-6">
        <div className="pointer-events-none absolute -right-4 -top-4 opacity-[0.07]">
          <Emblem className="h-24 w-24" spin />
        </div>
        <div className="relative flex items-center gap-3">
          <Emblem className="h-9 w-9 shrink-0" />
          <div>
            <div className="font-display text-lg tracking-wider-2">BLACK ROSE</div>
            <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Admin Console
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`
                    group flex items-center gap-3 px-3 py-2 font-tech text-[11px] uppercase tracking-wider-2 transition-colors
                    ${
                      active
                        ? "border-l-2 border-white bg-white/5 text-foreground"
                        : "border-l-2 border-transparent text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                    }
                  `}
                >
                  <item.icon
                    className={`h-4 w-4 ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-3 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 group-hover:text-destructive" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
