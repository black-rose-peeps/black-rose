import { createFileRoute, Link } from "@tanstack/react-router";
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
  Pencil,
  Shield,
  Sparkles,
} from "lucide-react";
import {
  hasMainGameIdentity,
  listConfiguredIdentitySummaries,
  mainGameIdentityConfig,
} from "@/features/member/utils/game-identity";
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
import { MemberDashboardSkeleton } from "@/features/member/components/MemberDashboardSkeleton";
import { MemberHeroBanner, MemberPageLayout } from "@/features/member/components/MemberShell";
import { SOCIAL_PLATFORM_LABELS } from "@/features/member/constants";
import { ChampionMarkGroup } from "@/features/championships/components/ChampionMarkGroup";
import { ChampionshipTitlesCard } from "@/features/championships/components/ChampionshipTitlesCard";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import { isProfileComplete } from "@/features/member/utils/profile-completion";
import { isSocialLinkPublic } from "@/features/member/utils/social-links";

const SECTION_LINK_CLASS =
  "touch-target inline-flex min-h-11 items-center rounded-none px-1 font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [{ title: "Dashboard — Black Rose" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, profile, championships, isLoading } = useMemberDashboardPage();
  const { celebrationOpen, celebrateIfUnseen, openCelebration, dismissCelebration } =
    useProfileCompleteCelebration(session?.id);

  useEffect(() => {
    if (!profile || isLoading) return;
    celebrateIfUnseen(profile.profileCompletion);
  }, [profile, isLoading, celebrateIfUnseen]);

  if (!session || isLoading) return <MemberDashboardSkeleton />;
  if (!hasFullMemberAccess(session.role) || !profile) return <MemberDashboardSkeleton />;

  const p = profile;
  const profileSlug = session.profileSlug ?? p.slug;
  const linkedSocials = p.socialLinks.filter((s) => s.url?.trim());
  const publicSocials = p.socialLinks.filter(isSocialLinkPublic);
  const totalSocials = p.socialLinks.length;
  const initials = p.avatarInitials || session.displayName.slice(0, 2).toUpperCase();

  return (
    <MemberPageLayout className="pb-12">
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
            p.upcomingMatches.length > 0 ? `${p.upcomingMatches.length} upcoming` : "None scheduled"
          }
        />
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <ProfileCompletionPanel
          completion={p.profileCompletion}
          onViewComplete={isProfileComplete(p.profileCompletion) ? openCelebration : undefined}
        />

        <DashboardSection label="Accounts" title="In-Game Identity">
          {(() => {
            const configured = listConfiguredIdentitySummaries(p);
            const mainConfig = mainGameIdentityConfig(p.mainGame);

            if (configured.length === 0) {
              return (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/5">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">No in-game IDs set</p>
                      <p className="text-xs text-muted-foreground/60">
                        Add identities per game on the Player tab — required when registering for
                        tournaments outside your main game.
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-none border-white/10 font-tech text-ui-readable uppercase"
                  >
                    <Link to="/dashboard/profile" search={{ tab: "player" }}>
                      <Pencil className="h-3.5 w-3.5" />
                      {mainConfig ? "Set In-Game IDs" : "Set Main Game & IDs"}
                    </Link>
                  </Button>
                </>
              );
            }

            return (
              <>
                <ul className="mb-4 flex flex-col gap-3">
                  {configured.map((entry) => (
                    <li key={entry.key} className="flex items-center gap-3">
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
                      <div>
                        <p className="text-sm font-medium">{entry.display}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.games.join(" · ")}
                          {entry.isMain ? " · MAIN GAME" : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {!hasMainGameIdentity(p) && mainConfig && (
                  <p className="mb-4 text-xs text-amber-400/90">
                    Your main game ({mainConfig.panelLabel}) identity is not set yet.
                  </p>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="rounded-none border-white/10 font-tech text-ui-readable uppercase"
                >
                  <Link to="/dashboard/profile" search={{ tab: "player" }}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit In-Game IDs
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

      <div className="grid gap-5 lg:grid-cols-2">
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
