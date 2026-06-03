import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCheck,
  Megaphone,
  Settings,
  Shield,
} from "lucide-react";

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
    name: "Announcements",
    href: "/admin/announcements",
    icon: Megaphone,
  },

  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const location = useLocation();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return (
      location.pathname === href ||
      location.pathname.startsWith(`${href}/`)
    );
  };

  return (
    <div className="w-64 border-r border-border bg-card/50 backdrop-blur">
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

      <nav className="px-3 pb-6">
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
    </div>
  );
}
