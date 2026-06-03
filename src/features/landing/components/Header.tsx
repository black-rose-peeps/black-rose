import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";
import { getSession, clearSession } from "@/features/auth/store/session";
import { getSavedAvatar } from "@/features/member/store/avatar";

const nav = [
  { label: "Tournaments", href: "/tournaments" },
  // { label: "Teams", href: "/teams" },
  { label: "Champions", href: "/" },
  { label: "Community", href: "/" },
];

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = getSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load uploaded avatar from localStorage on mount
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
        <Link to="/" className="flex items-center gap-3">
          <Emblem className="h-8 w-8" />
          <span className="font-display text-xl tracking-wider-2">BLACK ROSE</span>
        </Link>

        <nav className="hidden items-center gap-10 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground md:flex">
          {nav.map((n) => (
            <Link
              key={n.label}
              to={n.href}
              className={`transition-colors hover:text-foreground ${
                pathname === n.href ? "text-foreground" : ""
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            // Logged-in state
            <>
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex h-9 items-center gap-2 px-4 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {/* Avatar chip — photo if uploaded, otherwise initials */}
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
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs font-tech uppercase tracking-wider-2 text-muted-foreground/50 transition hover:text-muted-foreground"
              >
                Sign Out
              </button>
            </>
          ) : (
            // Guest state
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
