import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import { Emblem } from "@/features/shared/components/Emblem";
import { clearSession, getSession } from "@/features/auth/store/session";
import { getPostAuthPath, hasFullMemberAccess } from "@/features/auth/utils/routes";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

const MEMBER_CONSOLE_NAV = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Teams", to: "/teams" },
] as const;

const PUBLIC_NAV = [
  { label: "Tournaments", to: "/tournaments" },
  { label: "Champions", to: "/" },
] as const;

export function MemberNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Re-read session on navigation so avatar / profile slug stay in sync after edits.
  const session = getSession();
  const isVerifiedMember = session ? hasFullMemberAccess(session.role) : false;
  const profileSlug = session?.profileSlug ?? session?.username ?? "";
  const avatarUrl = session?.avatarUrl ?? null;
  const accountHref = isVerifiedMember
    ? { to: "/members/$slug" as const, params: { slug: profileSlug } }
    : { to: getPostAuthPath(session?.role ?? "not_verified") };

  function handleSignOut() {
    clearSession();
    window.location.href = "/";
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo — identical to landing Header */}
        <Link to="/" className="flex items-center gap-3">
          <Emblem className="h-8 w-8" />
          <span className="font-display text-xl tracking-wider-2">BLACK ROSE</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-10 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground md:flex">
          {isVerifiedMember && (
            <div className="flex items-center gap-6">
              {MEMBER_CONSOLE_NAV.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = "icon" in item ? item.icon : null;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    search={item.to === "/teams" ? { create: false } : undefined}
                    className={`inline-flex items-center gap-1.5 transition-colors hover:text-foreground ${active ? "text-foreground" : ""}`}
                  >
                    {Icon ? <Icon className="h-3 w-3" /> : null}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
          {PUBLIC_NAV.map(({ label, to }) => {
            const active =
              to === "/"
                ? pathname === "/"
                : pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={label}
                to={to}
                className={`transition-colors hover:text-foreground ${active ? "text-foreground" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User area */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {isVerifiedMember && <NotificationBell />}
              <Link
                {...accountHref}
                className="hidden h-9 items-center gap-2 px-4 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                <div className="h-5 w-5 shrink-0 overflow-hidden border border-white/15 bg-white/5">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-[10px] tracking-display">
                      {session.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {isVerifiedMember ? session.displayName : "Waitlist"}
                <User className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs font-tech uppercase tracking-wider-2 text-muted-foreground/50 transition hover:text-muted-foreground"
              >
                <LogOut className="h-3.5 w-3.5 sm:hidden" />
                <span className="hidden sm:block">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden h-9 items-center px-4 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="clip-cta inline-flex h-9 items-center bg-foreground px-5 text-xs font-tech uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
