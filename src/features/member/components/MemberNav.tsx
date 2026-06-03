import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LogOut, User } from "lucide-react";
import { Emblem } from "@/features/shared/components/Emblem";
import { clearSession, getSession } from "@/features/auth/store/session";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { getSavedAvatar } from "@/features/member/store/avatar";

// Mirrors the landing Header nav exactly — keep these in sync
const NAV_ITEMS = [
  { label: "Tournaments", to: "/tournaments" },
  { label: "Teams", to: "/teams" },
  { label: "Champions", to: "/" }, // placeholder
  // { label: "Community", to: "/" }, // placeholder
] as const;

export function MemberNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = getSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setAvatarUrl(getSavedAvatar());
  }, []);

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
          {NAV_ITEMS.map(({ label, to }) => {
            const active = to !== "/" && (pathname === to || pathname.startsWith(to + "/"));
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
          {session && (
            <>
              <NotificationBell />
              <Link
                to="/members/$slug"
                params={{ slug: session.username }}
                className="hidden h-9 items-center gap-2 px-4 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                {/* Avatar chip — shows photo if uploaded, else initials */}
                <div className="h-5 w-5 shrink-0 overflow-hidden border border-white/15 bg-white/5">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-[10px] tracking-display">
                      {session.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {session.displayName}
                <User className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs font-tech uppercase tracking-wider-2 text-muted-foreground/50 transition hover:text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5 sm:hidden" />
            <span className="hidden sm:block">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
