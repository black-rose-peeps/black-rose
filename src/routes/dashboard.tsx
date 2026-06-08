import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Trophy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Gamepad2,
  Users2,
  Calendar,
} from "lucide-react";
import { MemberNav } from "@/features/member/components/MemberNav";
import { QuickStat, DashboardSection } from "@/features/member/components/DashboardSection";
import { getSession } from "@/features/auth/store/session";
import { mockMemberProfile } from "@/lib/mock-member";
import { SOCIAL_PLATFORM_LABELS } from "@/features/member/constants";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Black Rose" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const session = getSession();

  useEffect(() => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    if (session.role === "not_verified") {
      navigate({ to: "/waitlist" });
      return;
    }
  }, [navigate, session]);

  if (!session || session.role === "not_verified") return null;

  const p = mockMemberProfile;
  const addedSocials = p.socialLinks.filter((s) => s.url).length;
  const totalSocials = p.socialLinks.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MemberNav />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-25" />

      {/* Hero strip — pushed down by fixed nav */}
      <div className="relative border-b border-white/6 bg-[oklch(0.06_0_0)] pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(255,255,255,0.04),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Member Console
              </p>
              <h1 className="mt-1 font-display text-4xl tracking-display sm:text-5xl">Dashboard</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Welcome back,{" "}
                <span className="font-medium text-foreground">{session.displayName}</span>
              </p>
            </div>
            <Link
              to="/members/$slug"
              params={{ slug: p.slug }}
              className="mt-4 inline-flex h-9 shrink-0 items-center gap-2 border border-white/12 bg-white/5 px-4 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground sm:mt-0"
            >
              View Public Profile
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <main className="relative mx-auto max-w-7xl px-6 pt-24 pb-10">
        {/* ── Quick-stat strip ──────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickStat icon={<Gamepad2 className="h-4 w-4" />} label="Main Game" value={p.mainGame} />
          <QuickStat icon={<Users2 className="h-4 w-4" />} label="Role" value={p.mainRole} />
          <QuickStat
            icon={<Trophy className="h-4 w-4" />}
            label="Tournaments"
            value={`${p.tournamentHistory.length} played`}
          />
          <QuickStat
            icon={<Calendar className="h-4 w-4" />}
            label="Matches"
            value={
              p.upcomingMatches.length > 0
                ? `${p.upcomingMatches.length} upcoming`
                : "None scheduled"
            }
          />
        </div>

        {/* ── Top row ───────────────────────────────────────────── */}
        <div className="mb-6 grid gap-5 lg:grid-cols-3">
          {/* Profile Completion */}
          <DashboardSection
            label="Profile"
            title="Profile Completion"
            action={
              <Link
                to="/members/$slug"
                params={{ slug: p.slug }}
                className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
              >
                Edit →
              </Link>
            }
          >
            <div className="flex items-end justify-between mb-2">
              <span className="font-display text-3xl tracking-display">{p.profileCompletion}%</span>
              <span className="text-xs text-muted-foreground mb-1">Complete</span>
            </div>
            <div className="h-1 w-full bg-white/8 mb-3">
              <div
                className="h-1 bg-white transition-all duration-500"
                style={{ width: `${p.profileCompletion}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {p.profileCompletion < 100
                ? "Add socials and link your Riot account to complete your profile."
                : "Profile fully set up."}
            </p>
          </DashboardSection>

          {/* Riot Account */}
          <DashboardSection label="Accounts" title="Riot Account">
            <div className="mb-4 flex items-center gap-3">
              {p.riotAccount?.isLinked ? (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-emerald-400/20 bg-emerald-400/5">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {p.riotAccount.gameName}#{p.riotAccount.tagline}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.riotAccount.region}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-amber-400/20 bg-amber-400/5">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Not linked</p>
                    <p className="text-xs text-muted-foreground/60">
                      Required for Valorant tournaments
                    </p>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              disabled
              title="Coming soon — Riot RSO integration"
              className="inline-flex h-8 cursor-not-allowed items-center border border-white/8 px-4 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground/40"
            >
              {p.riotAccount?.isLinked ? "Manage" : "Link Riot Account"}
            </button>
          </DashboardSection>

          {/* Active Registration */}
          <DashboardSection
            label="Tournament"
            title="Active Registration"
            action={
              p.activeRegistrations.length > 0 ? (
                <Link
                  to="/tournaments/$id"
                  params={{ id: p.activeRegistrations[0].tournamentId }}
                  className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
                >
                  View →
                </Link>
              ) : undefined
            }
          >
            {p.activeRegistrations.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="font-medium text-sm leading-tight">
                  {p.activeRegistrations[0].tournamentName}
                </p>
                <div className="flex items-center gap-2">
                  <span className="border border-white/10 px-1.5 py-0.5 font-tech text-[9px] uppercase tracking-wider-2 text-muted-foreground">
                    {p.activeRegistrations[0].teamTag}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.activeRegistrations[0].teamName}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-amber-400">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber-400" />
                  {p.activeRegistrations[0].status}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">No active registrations.</p>
                <Link
                  to="/tournaments"
                  className="inline-flex h-8 w-fit items-center gap-2 border border-white/12 px-4 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
                >
                  Browse Tournaments
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </DashboardSection>
        </div>

        {/* ── Bottom row ────────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Upcoming Matches */}
          <DashboardSection
            label="Schedule"
            title="Upcoming Matches"
            icon={<Trophy className="h-3.5 w-3.5" />}
          >
            {p.upcomingMatches.length > 0 ? (
              <ul className="divide-y divide-white/6">
                {p.upcomingMatches.map((m) => (
                  <li key={m.matchId} className="flex items-start justify-between py-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">{m.tournamentName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        vs {m.opponent} · {m.round}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                      {m.scheduledAt}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Calendar className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No scheduled matches yet.</p>
                <p className="text-xs text-muted-foreground/50">
                  Register for a tournament to get matched.
                </p>
              </div>
            )}
          </DashboardSection>

          {/* Social Links */}
          <DashboardSection
            label={`${addedSocials} / ${totalSocials} added`}
            title="Social Links"
            action={
              <Link
                to="/members/$slug"
                params={{ slug: p.slug }}
                className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
              >
                Manage →
              </Link>
            }
          >
            <ul className="flex flex-col gap-2.5">
              {p.socialLinks.map((s) => (
                <li key={s.platform} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {SOCIAL_PLATFORM_LABELS[s.platform]}
                  </span>
                  {s.url ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-tech uppercase tracking-wider-2 text-emerald-400">
                        Added
                      </span>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition hover:text-foreground"
                        aria-label={`Open ${SOCIAL_PLATFORM_LABELS[s.platform]}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/40">
                      Missing
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </DashboardSection>
        </div>
      </main>
    </div>
  );
}
