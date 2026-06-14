import { useEffect, useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { IdCard, LayoutDashboard, LogOut } from "lucide-react";
import { Emblem } from "@/features/shared/components/Emblem";
import {
  HeaderMobileMenu,
  type MobileNavSection,
} from "@/features/shared/components/HeaderMobileMenu";
import { clearSession, getSession } from "@/features/auth/store/session";
import { useMemberAccessSync } from "@/features/auth/hooks/useMemberAccessSync";
import { getPostAuthPath, hasFullMemberAccess } from "@/features/auth/utils/routes";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { setNotificationMemberId } from "@/features/notifications/store";
import { useNotificationSync } from "@/features/notifications/hooks/useNotificationSync";

const MEMBER_CONSOLE_NAV = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Teams", to: "/teams" },
] as const;

const PUBLIC_NAV = [
  { label: "Tournaments", to: "/tournaments" },
  { label: "Champions", to: "/champions" },
  { label: "Community", to: "/community" },
] as const;

export function MemberNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Re-read session on navigation so avatar / profile slug stay in sync after edits.
  const session = getSession();
  const isVerifiedMember = session ? hasFullMemberAccess(session.role) : false;
  const profileSlug = session?.profileSlug ?? session?.username ?? "";
  const avatarUrl = session?.avatarUrl ?? null;

  useEffect(() => {
    setNotificationMemberId(isVerifiedMember && session?.id ? session.id : null);
  }, [isVerifiedMember, session?.id]);

  useNotificationSync(isVerifiedMember ? session?.id : undefined);
  useMemberAccessSync();

  const accountHref = isVerifiedMember
    ? { to: "/members/$slug" as const, params: { slug: profileSlug } }
    : { to: getPostAuthPath(session?.role ?? "not_verified") };

  function handleSignOut() {
    setNotificationMemberId(null);
    clearSession();
    window.location.href = "/";
  }

  const mobileSections = useMemo((): MobileNavSection[] => {
    const sections: MobileNavSection[] = [];

    if (isVerifiedMember) {
      sections.push({
        title: "Console",
        items: MEMBER_CONSOLE_NAV.map((item) => ({
          label: item.label,
          to: item.to,
          search: item.to === "/teams" ? { create: false } : undefined,
          icon: "icon" in item ? item.icon : undefined,
          active: pathname === item.to || pathname.startsWith(`${item.to}/`),
        })),
      });
    }

    sections.push({
      title: isVerifiedMember ? "Explore" : undefined,
      items: PUBLIC_NAV.map(({ label, to }) => ({
        label,
        to,
        active: pathname === to || pathname.startsWith(`${to}/`),
      })),
    });

    if (session) {
      const accountActive =
        accountHref.to === "/waitlist"
          ? pathname === "/waitlist"
          : accountHref.to === "/members/$slug" && "params" in accountHref
            ? pathname === `/members/${accountHref.params.slug}`
            : pathname === "/dashboard/profile";

      sections.push({
        title: "Account",
        items: [
          {
            label: isVerifiedMember ? "My Profile" : "Waitlist Status",
            to: accountHref.to,
            params: "params" in accountHref ? accountHref.params : undefined,
            icon: IdCard,
            active: accountActive,
          },
        ],
      });
    }

    return sections;
  }, [accountHref, isVerifiedMember, pathname, session]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo — identical to landing Header */}
        <Link to="/" className="flex items-center">
          <Emblem className="h-16 w-16" />
          <span className="font-display text-xl tracking-wider-2">BLACK ROSE</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-10 font-tech text-label-readable uppercase text-muted-foreground md:flex">
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
                    className={`inline-flex items-center gap-1.5 font-semibold text-sm transition-colors hover:text-foreground ${active ? "text-foreground" : ""}`}
                  >
                    {Icon ? <Icon className="h-3 w-3" /> : null}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
          {PUBLIC_NAV.map(({ label, to }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
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
        <div className="flex items-center gap-2 sm:gap-3">
          <HeaderMobileMenu sections={mobileSections} />
          {session ? (
            <>
              {isVerifiedMember && <NotificationBell />}
              <Link
                {...accountHref}
                className="group hidden min-h-11 items-center gap-2 px-4 font-tech text-label-readable uppercase text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                <div className="h-5 w-5 shrink-0 overflow-hidden border border-white/15 bg-white/5">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-label-readable tracking-display">
                      {session.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {isVerifiedMember ? session.displayName : "Waitlist"}
                <IdCard
                  className="h-3.5 w-3.5 shrink-0 opacity-70 transition group-hover:opacity-100"
                  strokeWidth={1.5}
                />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-11 cursor-pointer font-tech text-label-readable uppercase text-muted-foreground/50 transition hover:text-muted-foreground"
              >
                <LogOut className="h-3.5 w-3.5 sm:hidden" />
                <span className="hidden sm:block">Sign Out</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="clip-cta font-semibold inline-flex h-11 items-center bg-foreground px-5 font-tech text-ui-readable uppercase text-background transition hover:bg-foreground/90"
            >
              Join Us
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
