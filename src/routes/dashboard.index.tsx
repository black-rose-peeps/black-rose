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
  Shield,
  Sparkles,
} from "lucide-react";
import { formatValorantRiotId } from "@/features/member/utils/valorant-identity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QuickStat, DashboardSection } from "@/features/member/components/DashboardSection";
import { ProfileCompletionPanel } from "@/features/member/components/ProfileCompletionPanel";
import { ProfileCompleteCelebrationDialog } from "@/features/member/components/ProfileCompleteCelebrationDialog";
import { useProfileCompleteCelebration } from "@/features/member/hooks/useProfileCompleteCelebration";
import { MemberDashboardSkeleton } from "@/features/member/components/MemberDashboardSkeleton";
import { MemberHeroBanner, MemberPageLayout } from "@/features/member/components/MemberShell";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { getSession } from "@/features/auth/store/session";
import { SOCIAL_PLATFORM_LABELS } from "@/features/member/constants";
import { fetchMemberProfileById } from "@/features/member/services/member-profile.service";
import { fetchMemberChampionships } from "@/features/championships/services/championship.service";
import { ChampionMarkGroup } from "@/features/championships/components/ChampionMarkGroup";
import { ChampionshipTitlesCard } from "@/features/championships/components/ChampionshipTitlesCard";
import type { ChampionshipTitle } from "@/features/championships/types";
import { fetchMemberTournamentDashboard } from "@/features/member/services/member-dashboard.service";
import { isProfileComplete } from "@/features/member/utils/profile-completion";
import { isSocialLinkPublic } from "@/features/member/utils/social-links";
import type { AppUser } from "@/features/auth/types";
import type { MemberProfile } from "@/features/member/types";

function profileFallbackFromSession(session: AppUser): MemberProfile {
  const initials = session.displayName.slice(0, 2).toUpperCase();
  return {
    memberId: session.id,
    slug: session.profileSlug ?? session.username,
    displayName: session.displayName,
    username: session.username,
    discordUsername: session.discordUsername ?? session.username,
    headline: "Black Rose Member",
    bio: "",
    avatarInitials: initials,
    avatarUrl: session.avatarUrl,
    mainGame: "",
    mainRole: "",
    region: "",
    isVerified: true,
    isPublic: true,
    socialLinks: [],
    valorantGameName: "",
    valorantTagline: "",
    tournamentHistory: [],
    activeRegistrations: [],
    upcomingMatches: [],
    profileCompletion: 0,
  };
}

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
  const [championships, setChampionships] = useState<ChampionshipTitle[]>([]);
  const {
    celebrationOpen,
    celebrateIfUnseen,
    dismissCelebration,
  } = useProfileCompleteCelebration(session?.id);

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

        const [memberProfile, tournamentDashboard] = await Promise.all([
          fetchMemberProfileById(updated.id),
          fetchMemberTournamentDashboard(updated.id),
        ]);
        if (!cancelled) {
          const base = memberProfile ?? profileFallbackFromSession(updated);
          setProfile({
            ...base,
            activeRegistrations: tournamentDashboard.activeRegistrations,
            upcomingMatches: tournamentDashboard.upcomingMatches,
            tournamentHistory: tournamentDashboard.tournamentHistory,
          });
        }
        if (!cancelled) {
          try {
            const titles = await fetchMemberChampionships(updated.id);
            if (!cancelled) setChampionships(titles);
          } catch {
            if (!cancelled) setChampionships([]);
          }
        }
      } catch {
        if (cancelled) return;
        if (!hasFullMemberAccess(current.role)) {
          navigate({ to: getPostAuthPath(current.role) });
          return;
        }
        setLocalSession(current);
        setProfile(profileFallbackFromSession(current));
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!profile || isSyncing) return;
    celebrateIfUnseen(profile.profileCompletion);
  }, [profile, isSyncing, celebrateIfUnseen]);

  useEffect(() => {
    if (!session?.id || !hasFullMemberAccess(session.role)) return;

    const memberId = session.id;

    async function refreshTournamentData() {
      try {
        const tournamentDashboard = await fetchMemberTournamentDashboard(memberId);
        setProfile((current) =>
          current
            ? {
                ...current,
                activeRegistrations: tournamentDashboard.activeRegistrations,
                upcomingMatches: tournamentDashboard.upcomingMatches,
                tournamentHistory: tournamentDashboard.tournamentHistory,
              }
            : current,
        );
      } catch {
        // Keep last loaded tournament dashboard data
      }

      try {
        const titles = await fetchMemberChampionships(memberId);
        setChampionships(titles);
      } catch {
        // Keep last loaded championships
      }
    }

    function handleFocus() {
      void refreshTournamentData();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [session?.id, session?.role]);

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
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {p.isVerified && (
                <Badge
                  variant="outline"
                  className="rounded-none border-emerald-400/25 bg-emerald-400/5 font-tech text-label-readable uppercase text-emerald-400"
                >
                  <Shield className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              )}
              {isProfileComplete(p.profileCompletion) && (
                <Badge
                  variant="outline"
                  className="rounded-none border-emerald-400/25 bg-emerald-400/5 font-tech text-label-readable uppercase text-emerald-300"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Arena Ready
                </Badge>
              )}
              {p.mainGame && (
                <Badge
                  variant="outline"
                  className="rounded-none border-white/12 bg-white/5 font-tech text-label-readable uppercase text-muted-foreground"
                >
                  <Gamepad2 className="mr-1 h-3 w-3" />
                  {p.mainGame}
                </Badge>
              )}
              {p.mainRole && (
                <Badge
                  variant="outline"
                  className="rounded-none border-white/12 bg-white/5 font-tech text-label-readable uppercase text-muted-foreground"
                >
                  <Users2 className="mr-1 h-3 w-3" />
                  {p.mainRole}
                </Badge>
              )}
            </div>
            {championships.length > 0 && (
              <ChampionMarkGroup titles={championships} size="md" showLabel />
            )}
          </div>
        }
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase hover:bg-white/10"
            >
              <Link to="/dashboard/profile" search={{ tab: "identity" }}>
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
              </Link>
            </Button>
            <Button
              asChild
              className="clip-cta inline-flex h-11 items-center rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90"
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
          label="Championships"
          value={
            championships.length > 0
              ? `${championships.length} title${championships.length === 1 ? "" : "s"}`
              : `${p.tournamentHistory.length} played`
          }
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
        <ProfileCompletionPanel completion={p.profileCompletion} />

        <DashboardSection label="Accounts" title="Valorant ID">
          {(() => {
            const valorantId = formatValorantRiotId(p.valorantGameName, p.valorantTagline);
            return (
              <>
                <div className="mb-4 flex items-center gap-3">
                  {valorantId ? (
                    <>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-emerald-400/20 bg-emerald-400/5">
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{valorantId}</p>
                        <p className="text-xs text-muted-foreground">Shown in Valorant rosters</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/5">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Not set</p>
                        <p className="text-xs text-muted-foreground/60">
                          Add your IGN and tagline in profile settings
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-none border-white/10 font-tech text-ui-readable uppercase"
                >
                  <Link to="/dashboard/profile" search={{ tab: "player" }}>
                    <Pencil className="h-3.5 w-3.5" />
                    {valorantId ? "Edit Valorant ID" : "Set Valorant ID"}
                  </Link>
                </Button>
              </>
            );
          })()}
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
                className="h-auto rounded-none p-0 font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                <Link to="/tournaments">Browse →</Link>
              </Button>
            ) : undefined
          }
        >
          {p.activeRegistrations.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {p.activeRegistrations.map((entry) => (
                <li key={`${entry.tournamentId}-${entry.teamTag}`} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-tight">{entry.tournamentName}</p>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-auto shrink-0 rounded-none p-0 font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground"
                    >
                      <Link to="/tournaments/$id" params={{ id: entry.tournamentId }}>
                        View →
                      </Link>
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-none border-white/10 font-tech text-label-readable uppercase text-muted-foreground"
                    >
                      {entry.teamTag}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{entry.teamName}</span>
                  </div>
                  {entry.status === "Pending" ? (
                    <div className="inline-flex items-center gap-1.5 font-tech text-ui-readable uppercase text-amber-400">
                      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber-400" />
                      Pending admin approval
                    </div>
                  ) : entry.status === "Approved" ? (
                    <div className="inline-flex items-center gap-1.5 font-tech text-ui-readable uppercase text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      Registered
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 font-tech text-ui-readable uppercase text-red-400">
                      Declined
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <ArenaEmptyState
              embedded
              eyebrow="No Entries"
              title={
                <>
                  No active <span className="text-stroke">registrations.</span>
                </>
              }
              description="Browse open tournaments and register your team when the next bracket opens."
              actions={
                <Button
                  asChild
                  variant="outline"
                  className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 font-tech text-ui-readable uppercase"
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
                  <span className="shrink-0 text-right font-tech text-label-readable uppercase text-muted-foreground">
                    {m.scheduledAt}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ArenaEmptyState
              embedded
              eyebrow="Clear Schedule"
              title={
                <>
                  No matches <span className="text-stroke">scheduled.</span>
                </>
              }
              description="Register for a tournament to get matched and see your upcoming games here."
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
              className="h-auto rounded-none p-0 font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground"
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
                    <span className="font-tech text-label-readable uppercase text-muted-foreground/35">
                      Missing
                    </span>
                  ) : isPublic ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-none border-emerald-400/20 bg-emerald-400/5 font-tech text-label-readable uppercase text-emerald-400"
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
                      className="rounded-none border-white/10 bg-white/5 font-tech text-label-readable uppercase text-muted-foreground"
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

      {championships.length > 0 && (
        <div className="mt-6">
          <ChampionshipTitlesCard titles={championships} />
        </div>
      )}

      <ProfileCompleteCelebrationDialog
        open={celebrationOpen}
        displayName={p.displayName}
        avatarUrl={p.avatarUrl}
        avatarInitials={p.avatarInitials}
        profileSlug={p.slug}
        onDismiss={dismissCelebration}
      />
    </MemberPageLayout>
  );
}
