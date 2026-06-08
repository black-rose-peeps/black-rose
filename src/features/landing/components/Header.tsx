import { Link, useRouterState } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";
import { getSession } from "@/features/auth/store/session";
import { MemberNav } from "@/features/member/components/MemberNav";

const GUEST_NAV = [
  { label: "Tournaments", href: "/tournaments" },
  { label: "Champions", href: "/" },
] as const;

function GuestHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <Emblem className="h-8 w-8" />
          <span className="font-display text-xl tracking-wider-2">BLACK ROSE</span>
        </Link>

        <nav className="hidden items-center gap-10 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground md:flex">
          {GUEST_NAV.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`transition-colors hover:text-foreground ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "text-foreground"
                  : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
        </div>
      </div>
    </header>
  );
}

/** Public-site header — uses member nav when a session exists. */
export function Header() {
  const session = getSession();

  if (session) {
    return <MemberNav />;
  }

  return <GuestHeader />;
}
