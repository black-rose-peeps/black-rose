import React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCheck,
  Megaphone,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
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
    <div className="flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-foreground">
            <Shield className="h-4 w-4 text-background" />
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-wider-2">Admin</div>
            <div className="text-xs text-muted-foreground">Control Panel</div>
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
                    group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                    ${
                      active
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
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
