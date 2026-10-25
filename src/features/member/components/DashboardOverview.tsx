import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import {
  Trophy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  Users2,
  Calendar,
  Pencil,
  Shield,
  Sparkles,
} from "lucide-react";
import {
  mainGameIdentityConfig,
  type ConfiguredIdentitySummary,
} from "@/features/member/utils/game-identity";
import { projectActiveGameVisibility } from "@/features/member/utils/active-game-visibility";
import { useActiveGames } from "@/features/admin/features/games/hooks/useGames";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QuickStat, DashboardSection } from "@/features/member/components/DashboardSection";
import { ActiveRegistrationsPanel } from "@/features/member/components/ActiveRegistrationsPanel";
import { UpcomingMatchesPanel } from "@/features/member/components/UpcomingMatchesPanel";
import { ProfileCompletionPanel } from "@/features/member/components/ProfileCompletionPanel";
import { ProfileCompleteCelebrationDialog } from "@/features/member/components/ProfileCompleteCelebrationDialog";
import { useProfileCompleteCelebration } from "@/features/member/hooks/useProfileCompleteCelebration";
import { useMemberDashboardPage } from "@/features/member/hooks/useMemberDashboardPage";
import { DashboardHubSkeleton } from "@/features/member/components/DashboardHubSkeleton";
import { MemberHeroBanner } from "@/features/member/components/MemberShell";
import { SOCIAL_PLATFORM_LABELS } from "@/features/member/constants";
import { ChampionMarkGroup } from "@/features/championships/components/ChampionMarkGroup";

import { ChampionshipTitlesCard } from "@/features/championships/components/ChampionshipTitlesCard";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import { isProfileComplete } from "@/features/member/utils/profile-completion";
import { isSocialLinkPublic } from "@/features/member/utils/social-links";

const SECTION_LINK_CLASS =
  "touch-target inline-flex min-h-11 items-center rounded-none px-1 font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground";

function OverviewIdentityList({ entries }: { entries: ConfiguredIdentitySummary[] }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const countId = `${listId}-count`;
  const canExpand = entries.length > 3;
  const showingAll = canExpand && expanded;
  const hiddenCount = entries.length - 3;

  useEffect(() => {
    if (!canExpand) setExpanded(false);
  }, [canExpand]);

  return (
    <>
      <ul id={listId} className="mb-4 flex flex-col gap-3">
        {(showingAll ? entries : entries.slice(0, 3)).map((entry, index) => (
          <li
            key={entry.key}
            className={`flex items-center gap-3 ${index >= 3 ? "animate-in fade-in duration-200 motion-reduce:animate-none" : ""}`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
                entry.isMain
                  ? "border-emerald-400/20 bg-emerald-400/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <CheckCircle
                className={`h-5 w-5 ${entry.isMain ? "text-emerald-400" : "text-muted-foreground"}`}
              />
            </div>
            <div className="min-w-0">
              <p className="break-words text-sm font-medium">{entry.display}</p>
              <p className="break-words text-xs leading-relaxed text-muted-foreground">
                {entry.games.join(" · ")}
                {entry.isMain ? " · MAIN GAME" : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {canExpand && (
        <div className="-mt-2 mb-2">
          <span id={countId} className="sr-only">
            Showing {showingAll ? entries.length : 3} of {entries.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="h-auto min-h-11 gap-1 rounded-none px-1 text-xs font-normal text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:ring-white/50 [&_svg]:size-3"
            aria-label={
              showingAll
                ? undefined
                : `Show ${hiddenCount} more ${hiddenCount === 1 ? "identity" : "identities"}`
            }
            aria-expanded={showingAll}
            aria-controls={listId}
            aria-describedby={countId}
            onClick={() => setExpanded((current) => !current)}
          >
            <span>{showingAll ? "Show less" : `${hiddenCount} more`}</span>
            <ChevronDown
              aria-hidden="true"
              className={`text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${showingAll ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      )}
    </>
  );
}

export function DashboardOverview({ navigation }: { navigation: ReactNode }) {
  const { session, profile, championships, isLoading } = useMemberDashboardPage();
  const { celebrationOpen, celebrateIfUnseen, openCelebration, dismissCelebration } =
    useProfileCompleteCelebration(session?.id);
  const activeGamesQuery = useActiveGames();
  const activeGames =
    activeGamesQuery.isPending || activeGamesQuery.isError ? [] : (activeGamesQuery.data ?? []);

  useEffect(() => {
    if (!profile || isLoading) return;
    celebrateIfUnseen(profile.profileCompletion);
  }, [profile, isLoading, celebrateIfUnseen]);

  if (!session || isLoading) return <DashboardHubSkeleton navigation={navigation} />;
  if (!hasFullMemberAccess(session.role) || !profile)
    return <DashboardHubSkeleton navigation={navigation} />;

  const p = profile;
  const visibleGames = projectActiveGameVisibility(p, activeGames);
  const profileSlug = session.profileSlug ?? p.slug;
  const linkedSocials = p.socialLinks.filter((s) => s.url?.trim());
  const publicSocials = p.socialLinks.filter(isSocialLinkPublic);
  const totalSocials = p.socialLinks.length;

  const initials = p.avatarInitials || session.displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <MemberHeroBanner
        eyebrow="Dashboard · Member Console"
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
                  <Shield className="mr-1 h-3 w-3" aria-hidden /> Verified
                </Badge>
              )}
              {visibleGames.mainGame && (
                <Badge
                  variant="outline"
                  className="max-w-full gap-1 whitespace-normal rounded-none border-white/12 bg-white/5 font-tech text-label-readable uppercase text-muted-foreground"
                >
                  <Gamepad2 className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="break-words">{visibleGames.mainGame}</span>
                </Badge>
              )}
              {visibleGames.mainRole && (
                <Badge
                  variant="outline"
                  className="max-w-full gap-1 whitespace-normal rounded-none border-white/12 bg-white/5 font-tech text-label-readable uppercase text-muted-foreground"
                >
                  <Users2 className="h-3 w-3 shrink-0" aria-hidden />
                  {visibleGames.mainRole}
                </Badge>
              )}
              {isProfileComplete(p.profileCompletion) && (
                <Badge
                  variant="outline"
                  className="rounded-none border-emerald-400/25 bg-emerald-400/5 font-tech text-label-readable uppercase text-emerald-300"
                >
                  <Sparkles className="h-3 w-3" aria-hidden /> Arena Ready
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
              <Link to="/br/$slug" params={{ slug: profileSlug }}>
                Public Profile
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      >
        <Avatar className="h-16 w-16 rounded-none border-2 border-white/20 sm:h-20 sm:w-20">
          <AvatarImage src={p.avatarUrl ?? session.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="rounded-none bg-white/5 font-display text-2xl tracking-display">
            {initials}
          </AvatarFallback>
        </Avatar>
      </MemberHeroBanner>

      {navigation}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickStat
          icon={<Gamepad2 className="h-4 w-4" />}
          label="Main Game"
          value={visibleGames.mainGame}
          empty={!visibleGames.mainGame}
        />
        <QuickStat
          icon={<Users2 className="h-4 w-4" />}
          label="Main Role"
          value={visibleGames.mainRole}
          empty={!visibleGames.mainRole}
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
            p.upcomingMatches.length > 0 ? `${p.upcomingMatches.length} upcoming` : "None scheduled"
          }
        />
      </div>

      <div className="mb-6 grid items-stretch gap-5 lg:grid-cols-3">
        <ProfileCompletionPanel
          completion={p.profileCompletion}
          onViewComplete={isProfileComplete(p.profileCompletion) ? openCelebration : undefined}
        />

        <DashboardSection label="Accounts" title="In-Game Identity">
          {(() => {
            const configured = visibleGames.identitySummaries;
            const mainConfig = mainGameIdentityConfig(visibleGames.mainGame, activeGames);

            if (configured.length === 0) {
              return (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/5">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">No in-game IDs set</p>
                      <p className="text-xs text-muted-foreground/60">
                        Add an identity in My Games before entering a tournament.
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="min-h-11 rounded-none border-white/10 font-tech text-ui-readable"
                  >
                    <Link
                      to="/dashboard"
                      search={{
                        view: "games",
                        ...(visibleGames.mainGame ? { focusGame: visibleGames.mainGame } : {}),
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Manage My Games
                    </Link>
                  </Button>
                </>
              );
            }

            return (
              <>
                <OverviewIdentityList key={session.id} entries={configured} />
                {!configured.some((entry) => entry.isMain) && mainConfig && (
                  <p className="mb-4 text-xs text-amber-400/90">
                    Your main game ({mainConfig.panelLabel}) identity is not set yet.
                  </p>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 rounded-none border-white/10 font-tech text-ui-readable"
                >
                  <Link
                    to="/dashboard"
                    search={{
                      view: "games",
                      ...(visibleGames.mainGame ? { focusGame: visibleGames.mainGame } : {}),
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Manage My Games
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
              <Button asChild variant="ghost" size="sm" className={SECTION_LINK_CLASS}>
                <Link to="/tournaments">Browse →</Link>
              </Button>
            ) : undefined
          }
        >
          <ActiveRegistrationsPanel entries={p.activeRegistrations} />
        </DashboardSection>
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <DashboardSection
          label="Schedule"
          title="Upcoming Matches"
          icon={<Trophy className="h-3.5 w-3.5" />}
        >
          <UpcomingMatchesPanel matches={p.upcomingMatches} />
        </DashboardSection>
        <DashboardSection
          label={`${publicSocials.length} public · ${linkedSocials.length} / ${totalSocials} linked`}
          title="Social Links"
          action={
            <Button asChild variant="ghost" size="sm" className={SECTION_LINK_CLASS}>
              <Link to="/dashboard/profile" search={{ tab: "socials" }}>
                Manage →
              </Link>
            </Button>
          }
        >
          <ul className="flex flex-col gap-1 sm:gap-1.5">
            {p.socialLinks.map((s) => {
              const hasUrl = Boolean(s.url?.trim());
              const isPublic = isSocialLinkPublic(s);

              return (
                <li
                  key={s.platform}
                  className="flex min-h-0 items-center justify-between gap-3 py-0.5"
                >
                  <span className="text-sm leading-snug text-muted-foreground">
                    {SOCIAL_PLATFORM_LABELS[s.platform]}
                  </span>
                  {!hasUrl ? (
                    <span className="font-tech text-label-readable uppercase text-muted-foreground/35">
                      Missing
                    </span>
                  ) : isPublic ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="h-6 rounded-none border-emerald-400/20 bg-emerald-400/5 px-2 py-0 font-tech text-label-readable uppercase leading-none text-emerald-400"
                      >
                        Public
                      </Badge>
                      <a
                        href={s.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="-m-1.5 inline-flex p-1.5 text-muted-foreground transition hover:text-foreground active:opacity-70"
                        aria-label={`Open ${SOCIAL_PLATFORM_LABELS[s.platform]}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="h-6 rounded-none border-white/10 bg-white/5 px-2 py-0 font-tech text-label-readable uppercase leading-none text-muted-foreground"
                    >
                      Private
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
          {p.socialLinks.length === 0 && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              No social links added yet. Use Manage to add your links and choose their visibility.
            </p>
          )}
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
    </>
  );
}
