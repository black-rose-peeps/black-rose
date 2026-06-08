import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { syncSessionFromDatabase } from "@/features/auth/services/sync-session";
import { getPostAuthPath, hasFullMemberAccess } from "@/features/auth/utils/routes";
import {
  Trophy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Gamepad2,
  Users2,
  Calendar,
  Pencil,
  Link2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QuickStat, DashboardSection } from "@/features/member/components/DashboardSection";
import { MemberDashboardSkeleton } from "@/features/member/components/MemberDashboardSkeleton";
import { MemberHeroBanner, MemberPageLayout, PanelEmptyState } from "@/features/member/components/MemberShell";
import { getSession } from "@/features/auth/store/session";
import { SOCIAL_PLATFORM_LABELS } from "@/features/member/constants";
import { fetchMemberProfileById } from "@/features/member/services/member-profile.service";
import { profileCompletionHint } from "@/features/member/utils/profile-completion";
import { isSocialLinkPublic } from "@/features/member/utils/social-links";
import type { MemberProfile } from "@/features/member/types";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [{ title: "Dashboard — Black Rose" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [session, setLocalSession] = useState(() => getSession());
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const current = getSession();
      if (!current) {
        navigate({ to: "/login" });
        return;
      }

      try {
        const updated = await syncSessionFromDatabase();
        if (cancelled) return;

        if (!updated) {
          navigate({ to: "/login" });
          return;
        }

        setLocalSession(updated);

        if (!hasFullMemberAccess(updated.role)) {
          navigate({ to: getPostAuthPath(updated.role) });
          return;
        }

        const memberProfile = await fetchMemberProfileById(updated.id);
        if (!cancelled) setProfile(memberProfile);
      } catch {
        if (cancelled) return;
        if (!hasFullMemberAccess(current.role)) {
          navigate({ to: getPostAuthPath(current.role) });
          return;
        }
        setLocalSession(current);
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!session || isSyncing) return <MemberDashboardSkeleton />;
  if (!hasFullMemberAccess(session.role) || !profile) return <MemberDashboardSkeleton />;

  const p = profile;
  const profileSlug = session.profileSlug ?? p.slug;
  const linkedSocials = p.socialLinks.filter((s) => s.url?.trim());
  const publicSocials = p.socialLinks.filter(isSocialLinkPublic);
  const totalSocials = p.socialLinks.length;
  const initials = p.avatarInitials || session.displayName.slice(0, 2).toUpperCase();

  return (
    <MemberPageLayout>
      <MemberHeroBanner
        eyebrow="Member Console"
        title={session.displayName}
        subtitle={p.headline || "Black Rose verified member"}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            {p.isVerified && (
              <Badge
                variant="outline"
                className="rounded-none border-emerald-400/25 bg-emerald-400/5 font-tech text-[9px] uppercase tracking-wider-2 text-emerald-400"
              >
                <Shield className="mr-1 h-3 w-3" />
                Verified
              </Badge>
            )}
            {p.mainGame && (
              <Badge
                variant="outline"
                className="rounded-none border-white/12 bg-white/5 font-tech text-[9px] uppercase tracking-wider-2 text-muted-foreground"
              >
                <Gamepad2 className="mr-1 h-3 w-3" />
                {p.mainGame}
              </Badge>
            )}
            {p.mainRole && (
              <Badge
                variant="outline"
                className="rounded-none border-white/12 bg-white/5 font-tech text-[9px] uppercase tracking-wider-2 text-muted-foreground"
              >
                <Users2 className="mr-1 h-3 w-3" />
                {p.mainRole}
              </Badge>
            )}
          </div>
        }
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="clip-cta rounded-none border-white/15 bg-white/5 font-tech text-[10px] uppercase tracking-wider-2 hover:bg-white/10"
            >
              <Link to="/dashboard/profile" search={{ tab: "identity" }}>
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
              </Link>
            </Button>
            <Button
              asChild
              className="clip-cta rounded-none bg-white font-tech text-[10px] uppercase tracking-wider-2 text-black hover:bg-white/90"
            >
              <Link to="/members/$slug" params={{ slug: profileSlug }}>
                Public Profile
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      >
        <Avatar className="h-20 w-20 rounded-none border-2 border-white/20">
          <AvatarImage src={p.avatarUrl ?? session.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="rounded-none bg-white/5 font-display text-2xl tracking-display">
            {initials}
          </AvatarFallback>
        </Avatar>
      </MemberHeroBanner>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickStat
          icon={<Gamepad2 className="h-4 w-4" />}
          label="Main Game"
          value={p.mainGame}
          empty={!p.mainGame}
        />
        <QuickStat
          icon={<Users2 className="h-4 w-4" />}
          label="Main Role"
          value={p.mainRole}
          empty={!p.mainRole}
        />
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

      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <DashboardSection
          label="Profile"
          title="Completion"
          action={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-auto rounded-none p-0 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <Link to="/dashboard/profile" search={{ tab: "identity" }}>
                Edit →
              </Link>
            </Button>
          }
        >
          <div className="mb-3 flex items-end justify-between">
            <span className="font-display text-4xl tracking-display">{p.profileCompletion}%</span>
            <span className="mb-1 text-xs text-muted-foreground">Complete</span>
          </div>
          <Progress
            value={p.profileCompletion}
            className="mb-4 h-1 rounded-none bg-white/10 [&>div]:rounded-none [&>div]:bg-white"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {profileCompletionHint(p.profileCompletion)}
          </p>
        </DashboardSection>

        <DashboardSection label="Accounts" title="Riot Account">
          <div className="mb-4 flex items-center gap-3">
            {p.riotAccount?.isLinked ? (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-emerald-400/20 bg-emerald-400/5">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">
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
          <Button
            type="button"
            disabled
            variant="outline"
            title="Coming soon — Riot RSO integration"
            className="rounded-none border-white/10 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground/40"
          >
            <Link2 className="h-3.5 w-3.5" />
            {p.riotAccount?.isLinked ? "Manage" : "Link Riot Account"}
          </Button>
        </DashboardSection>

        <DashboardSection
          label="Tournament"
          title="Active Registration"
          action={
            p.activeRegistrations.length > 0 ? (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-auto rounded-none p-0 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                <Link
                  to="/tournaments/$id"
                  params={{ id: p.activeRegistrations[0].tournamentId }}
                >
                  View →
                </Link>
              </Button>
            ) : undefined
          }
        >
          {p.activeRegistrations.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium leading-tight">
                {p.activeRegistrations[0].tournamentName}
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-none border-white/10 font-tech text-[9px] uppercase tracking-wider-2 text-muted-foreground"
                >
                  {p.activeRegistrations[0].teamTag}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {p.activeRegistrations[0].teamName}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider-2 text-amber-400">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber-400" />
                {p.activeRegistrations[0].status}
              </div>
            </div>
          ) : (
            <PanelEmptyState
              icon={<Trophy className="h-6 w-6" />}
              title="No active registrations"
              description="Browse open tournaments and register your team."
              action={
                <Button
                  asChild
                  variant="outline"
                  className="mt-1 clip-cta rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
                >
                  <Link to="/tournaments">
                    Browse Tournaments
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            />
          )}
        </DashboardSection>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardSection
          label="Schedule"
          title="Upcoming Matches"
          icon={<Trophy className="h-3.5 w-3.5" />}
        >
          {p.upcomingMatches.length > 0 ? (
            <ul className="divide-y divide-white/6">
              {p.upcomingMatches.map((m) => (
                <li key={m.matchId} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{m.tournamentName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      vs {m.opponent} · {m.round}
                    </p>
                  </div>
                  <span className="shrink-0 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                    {m.scheduledAt}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <PanelEmptyState
              icon={<Calendar className="h-6 w-6" />}
              title="No scheduled matches yet"
              description="Register for a tournament to get matched."
            />
          )}
        </DashboardSection>

        <DashboardSection
          label={`${publicSocials.length} public · ${linkedSocials.length} / ${totalSocials} linked`}
          title="Social Links"
          action={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-auto rounded-none p-0 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <Link to="/dashboard/profile" search={{ tab: "socials" }}>
                Manage →
              </Link>
            </Button>
          }
        >
          <ul className="flex flex-col gap-2.5">
            {p.socialLinks.map((s) => {
              const hasUrl = Boolean(s.url?.trim());
              const isPublic = isSocialLinkPublic(s);

              return (
                <li key={s.platform} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {SOCIAL_PLATFORM_LABELS[s.platform]}
                  </span>
                  {!hasUrl ? (
                    <span className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground/35">
                      Missing
                    </span>
                  ) : isPublic ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-none border-emerald-400/20 bg-emerald-400/5 font-tech text-[9px] uppercase tracking-wider-2 text-emerald-400"
                      >
                        Public
                      </Badge>
                      <a
                        href={s.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition hover:text-foreground"
                        aria-label={`Open ${SOCIAL_PLATFORM_LABELS[s.platform]}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-none border-white/10 bg-white/5 font-tech text-[9px] uppercase tracking-wider-2 text-muted-foreground"
                    >
                      Private
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </DashboardSection>
      </div>
    </MemberPageLayout>
  );
}
