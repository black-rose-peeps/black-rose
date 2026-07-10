import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ScrollText, Shield, Trophy, UserCheck, Users } from "lucide-react";

export type AdminNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const ADMIN_NAVIGATION: AdminNavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { name: "Tournaments", href: "/admin/tournaments", icon: Trophy },
  { name: "Members", href: "/admin/users", icon: Shield },
  { name: "Teams", href: "/admin/teams", icon: Users },
  { name: "Participants", href: "/admin/participants", icon: UserCheck },
  { name: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
];

export function isAdminNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
