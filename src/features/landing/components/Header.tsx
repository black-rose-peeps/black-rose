import { Link, useRouterState } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";
import { BrandWordmark } from "@/features/shared/components/BrandWordmark";
import { HeaderMobileMenu } from "@/features/shared/components/HeaderMobileMenu";
import { useMemberSession } from "@/features/auth/hooks/useMemberSession";
import { MemberNav } from "@/features/member/components/MemberNav";

const GUEST_NAV = [
  { label: "Tournaments", to: "/tournaments" as const },
  { label: "Champions", to: "/champions" as const },
  { label: "Community", to: "/community" as const },
] as const;

function GuestHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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

  const mobileSections = [
    {
      items: GUEST_NAV.map((item) => ({
        label: item.label,
        to: item.to,
        active: isGuestNavActive(item),
      })),
    },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 safe-top border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <HeaderMobileMenu sections={mobileSections} />
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-none sm:gap-0">
            <Emblem className="h-12 w-12 shrink-0 sm:h-16 sm:w-16" />
            <BrandWordmark />
          </Link>
        </div>

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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="clip-cta font-semibold inline-flex h-11 items-center bg-foreground px-5 text-sm font-tech uppercase tracking-[0.08em] text-background transition hover:bg-foreground/90"
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
  const session = useMemberSession();

  if (session) {
    return <MemberNav />;
  }

  return <GuestHeader />;
}
