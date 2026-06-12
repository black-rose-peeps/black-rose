import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";
import { HeaderMobileMenu } from "@/features/shared/components/HeaderMobileMenu";
import { getSession } from "@/features/auth/store/session";
import { MemberNav } from "@/features/member/components/MemberNav";

const GUEST_NAV = [
  { label: "Tournaments", to: "/tournaments" as const },
  { label: "Champions", to: "/champions" as const },
  { label: "Community", to: "/community" as const },
] as const;

function GuestHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const mobileSections = useMemo(
    () => [
      {
        items: GUEST_NAV.map((item) => ({
          label: item.label,
          to: item.to,
          active:
            item.to === "/tournaments"
              ? pathname === "/tournaments" || pathname.startsWith("/tournaments/")
              : item.to === "/champions"
                ? pathname === "/champions" || pathname.startsWith("/champions/")
                : pathname === "/community" || pathname.startsWith("/community/"),
        })),
      },
    ],
    [pathname],
  );

  function isGuestNavActive(item: (typeof GUEST_NAV)[number]): boolean {
    if (item.to === "/tournaments") {
      return pathname === "/tournaments" || pathname.startsWith("/tournaments/");
    }
    if (item.to === "/champions") {
      return pathname === "/champions" || pathname.startsWith("/champions/");
    }
    if (item.to === "/community") {
      return pathname === "/community" || pathname.startsWith("/community/");
    }
    return false;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <Emblem className="h-16 w-16" />
          <span className="font-display text-xl tracking-wider-2">BLACK ROSE</span>
        </Link>

        <nav className="hidden items-center gap-10 text-sm font-tech uppercase tracking-[0.08em] text-muted-foreground md:flex">
          {GUEST_NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`font-semibold text-sm transition-colors hover:text-foreground ${
                isGuestNavActive(item) ? "text-foreground" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <HeaderMobileMenu sections={mobileSections} />
          <Link
            to="/login"
            className="clip-cta inline-flex h-11 items-center bg-foreground px-5 text-sm font-tech uppercase tracking-[0.08em] text-background transition hover:bg-foreground/90"
          >
            Join Us
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
