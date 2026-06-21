import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, ExternalLink, Gamepad2, MapPin, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminDetailGrid, AdminPageHero, TechPanel } from "@/features/admin/components/AdminShell";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { SOCIAL_PLATFORM_LABELS, SOCIAL_PLATFORM_ORDER } from "@/features/member/constants";
import { resolveMemberProfileSlug } from "@/features/member/utils/profile-slug";
import { useIsMobile } from "@/hooks/use-mobile";
import { memberStatusBadgeVariant, memberNeedsSyncQueueReset } from "../utils";
import { fetchProfileCommentsAsAdmin } from "@/features/member/services/profile-comments.service";
import { AdminMemberCommentsPanel } from "./AdminMemberCommentsPanel";
import { MemberDetailMobileNav, MemberMobileSocialList, type MemberDetailTab } from "./mobile";
import type { AdminMember } from "../types";
import type { MemberProfile } from "@/features/member/types";

interface AdminMemberDetailProps {
  member: AdminMember | null;
  profile: MemberProfile | null;
  isLoading: boolean;
  error: string | null;
}

export function AdminMemberDetail({ member, profile, isLoading, error }: AdminMemberDetailProps) {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<MemberDetailTab>("profile");
  const [commentsCount, setCommentsCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!member?.id) {
      setCommentsCount(undefined);
      return;
    }

    let cancelled = false;
    void fetchProfileCommentsAsAdmin(member.id, { page: 1, pageSize: 1 })
      .then((data) => {
        if (!cancelled) setCommentsCount(data.total);
      })
      .catch(() => {
        if (!cancelled) setCommentsCount(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [member?.id]);

  if (isLoading) {
    return (
      <AdminPageContent className={isMobile ? "pb-24" : undefined}>
        {isMobile ? (
          <div className="space-y-4 md:hidden">
            <Skeleton className="h-8 w-32 rounded-none bg-white/5" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-none bg-white/5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40 rounded-none bg-white/5" />
                <Skeleton className="h-4 w-28 rounded-none bg-white/5" />
              </div>
            </div>
            <Skeleton className="h-36 w-full rounded-none bg-white/5" />
            <Skeleton className="h-48 w-full rounded-none bg-white/5" />
          </div>
        ) : (
          <>
            <Skeleton className="h-40 w-full rounded-none bg-white/5" />
            <div className="grid gap-5 lg:grid-cols-3">
              <Skeleton className="h-48 rounded-none bg-white/5 lg:col-span-2" />
              <Skeleton className="h-48 rounded-none bg-white/5" />
            </div>
          </>
        )}
      </AdminPageContent>
    );
  }

  if (error || !member) {
    return (
      <AdminPageContent>
        <AdminPageHero
          title="Member Not Found"
          description={error ?? "This member could not be loaded."}
          backLink={
            <Button
              asChild
              variant="ghost"
              className="-ml-2 rounded-none font-tech text-[10px] uppercase tracking-wider-2"
            >
              <Link to="/admin/users">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Members
              </Link>
            </Button>
          }
        />
      </AdminPageContent>
    );
  }

  const initials = profile?.avatarInitials ?? member.username.slice(0, 2).toUpperCase();
  const showSyncDiagnostics = memberNeedsSyncQueueReset(member);
  const profileOwner = {
    displayName: profile?.displayName ?? member.username,
    slug: resolveMemberProfileSlug(profile?.slug, member.username),
    discordUsername: member.discordUsername,
    avatarUrl: profile?.avatarUrl ?? null,
    avatarInitials: initials,
  };

  const gameInfoPanel = (
    <TechPanel label="Player" title="Game Info">
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Main Game
          </dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-display text-lg tracking-display">
            <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />
            {profile?.mainGame || "—"}
          </dd>
        </div>
        <div className="h-px bg-white/6" />
        <div>
          <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Role
          </dt>
          <dd className="mt-0.5 text-sm">{profile?.mainRole || "—"}</dd>
        </div>
        <div className="h-px bg-white/6" />
        <div>
          <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Region
          </dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-sm">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {profile?.region || "—"}
          </dd>
        </div>
      </dl>
    </TechPanel>
  );

  const verificationPanel = (
    <TechPanel label="Account" title="Verification">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {member.status === "Verified" ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : (
            <Shield className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">{member.status}</span>
        </div>
        {profile && (
          <div className="text-xs text-muted-foreground">
            Profile {profile.isPublic ? "public" : "private"} · {profile.profileCompletion}%
            complete
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          ID: <span className="font-mono">{member.id}</span>
        </div>
      </div>
    </TechPanel>
  );

  const identityPanel = (
    <TechPanel label="Identity" title="Profile">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar className="h-20 w-20 rounded-none border-2 border-white/20">
          <AvatarImage src={profile?.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="rounded-none bg-white/5 font-display text-2xl tracking-display">
            {initials}
          </AvatarFallback>
        </Avatar>
        <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Username
            </dt>
            <dd className="mt-0.5 font-medium">{member.username}</dd>
          </div>
          <div>
            <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Registered
            </dt>
            <dd className="mt-0.5 text-muted-foreground">{member.registeredAt}</dd>
          </div>
          {showSyncDiagnostics ? (
            <div>
              <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Discord sync
              </dt>
              <dd className="mt-0.5 text-muted-foreground">
                {member.discordNotInGuildStrikes} not-in-guild strike
                {member.discordNotInGuildStrikes === 1 ? "" : "s"}
                {member.discordSyncPausedAt
                  ? ` · paused ${new Date(member.discordSyncPausedAt).toLocaleDateString()}`
                  : ""}
              </dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Headline
            </dt>
            <dd className="mt-0.5 text-muted-foreground">{profile?.headline || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Bio
            </dt>
            <dd className="mt-0.5 leading-relaxed text-muted-foreground">
              {profile?.bio || "No bio yet."}
            </dd>
          </div>
        </dl>
      </div>
    </TechPanel>
  );

  if (isMobile) {
    return (
      <>
        <AdminPageContent className="pb-24">
          <div className="flex flex-col gap-4 md:hidden">
            <Button
              asChild
              variant="ghost"
              className="-ml-2 w-fit rounded-none font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:text-foreground"
            >
              <Link to="/admin/users">
                <ArrowLeft className="h-3.5 w-3.5" />
                Members
              </Link>
            </Button>

            <div className="flex items-start gap-3">
              <Avatar className="h-14 w-14 shrink-0 rounded-none border-2 border-white/20">
                <AvatarImage src={profile?.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="rounded-none bg-white/5 font-display text-lg tracking-display">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl tracking-display">
                    {profile?.displayName ?? member.username}
                  </h1>
                  <Badge variant={memberStatusBadgeVariant(member.status)} className="rounded-none">
                    {member.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  @{member.discordUsername}
                  {member.discordId ? ` · ${member.discordId}` : ""}
                </p>
                {profile?.slug ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-2 clip-cta rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
                  >
                    <Link to="/members/$slug" params={{ slug: profile.slug }} target="_blank">
                      Public Profile
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {mobileTab === "profile" ? (
            <div className="flex flex-col gap-4 md:hidden">
              {gameInfoPanel}
              {identityPanel}
              {verificationPanel}
            </div>
          ) : null}

          {mobileTab === "social" ? (
            <TechPanel label="Links" title="Social Accounts" noPadding className="md:hidden">
              <MemberMobileSocialList profile={profile} />
            </TechPanel>
          ) : null}

          {mobileTab === "comments" ? (
            <div className="md:hidden">
              <AdminMemberCommentsPanel
                profileMemberId={member.id}
                profileOwner={profileOwner}
                onCommentsCountChange={setCommentsCount}
              />
            </div>
          ) : null}
        </AdminPageContent>

        <MemberDetailMobileNav
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          commentsCount={commentsCount}
        />
      </>
    );
  }

  return (
    <AdminPageContent>
      <AdminPageHero
        eyebrow="Member Detail"
        title={profile?.displayName ?? member.username}
        description={`@${member.discordUsername}${member.discordId ? ` · ${member.discordId}` : ""}`}
        backLink={
          <Button
            asChild
            variant="ghost"
            className="-ml-2 rounded-none font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:text-foreground"
          >
            <Link to="/admin/users">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Members
            </Link>
          </Button>
        }
        actions={
          <>
            <Badge variant={memberStatusBadgeVariant(member.status)} className="rounded-none">
              {member.status}
            </Badge>
            {profile?.slug && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="clip-cta rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
              >
                <Link to="/members/$slug" params={{ slug: profile.slug }} target="_blank">
                  Public Profile
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            )}
          </>
        }
      />

      <AdminDetailGrid>
        <div className="flex flex-col gap-5 lg:col-span-2">
          {identityPanel}

          <TechPanel label="Links" title="Social Accounts" noPadding>
            <ul className="divide-y divide-white/6">
              {SOCIAL_PLATFORM_ORDER.map((platform) => {
                const link = profile?.socialLinks.find((s) => s.platform === platform);
                return (
                  <li
                    key={platform}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <span className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                      {SOCIAL_PLATFORM_LABELS[platform]}
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                      {link?.url ? (
                        <>
                          <Badge
                            variant="outline"
                            className={cnBadge(
                              link.isPublic
                                ? "border-emerald-400/20 text-emerald-400"
                                : "border-amber-400/20 text-amber-400",
                            )}
                          >
                            {link.isPublic ? "Public" : "Private"}
                          </Badge>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-xs text-muted-foreground hover:text-foreground"
                          >
                            {link.url}
                          </a>
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">Not set</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </TechPanel>

          <AdminMemberCommentsPanel profileMemberId={member.id} profileOwner={profileOwner} />
        </div>

        <div className="flex flex-col gap-5">
          {gameInfoPanel}
          {verificationPanel}
        </div>
      </AdminDetailGrid>
    </AdminPageContent>
  );
}

function cnBadge(extra: string) {
  return `rounded-none font-tech text-[9px] uppercase tracking-wider-2 ${extra}`;
}
