import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import type { AnchorHTMLAttributes } from "react";
import {
  ExternalLink,
  CheckCircle,
  Shield,
  MapPin,
  Gamepad2,
  ArrowLeft,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { ProfileCard } from "@/features/member/components/ProfileCard";
import { MemberProfileSkeleton } from "@/features/member/components/MemberProfileSkeleton";
import { MemberHeroBanner, MemberPageLayout } from "@/features/member/components/MemberShell";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { DiscordAppAnchor } from "@/features/shared/components/DiscordAppAnchor";
import { SOCIAL_PLATFORM_LABELS, SOCIAL_PLATFORM_ORDER } from "@/features/member/constants";
import { getSession } from "@/features/auth/store/session";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import { ProfileCommentsPanel } from "@/features/member/components/ProfileCommentsPanel";
import { fetchMemberProfileBySlug } from "@/features/member/services/member-profile.service";
import { fetchMemberChampionships } from "@/features/championships/services/championship.service";
import { ChampionMarkGroup } from "@/features/championships/components/ChampionMarkGroup";
import { ChampionshipTitlesCard } from "@/features/championships/components/ChampionshipTitlesCard";
import type { ChampionshipTitle } from "@/features/championships/types";
import type { MemberProfile, SocialPlatform } from "@/features/member/types";
import { isSocialLinkPublic } from "@/features/member/utils/social-links";
import { isDiscordHttpsUrl } from "@/lib/discord-url";

export const Route = createFileRoute("/members/$slug")({
  head: () => ({
    meta: [{ title: "Member — Black Rose" }],
  }),
  component: MemberProfilePage,
});

function ProfileExternalLink({
  href,
  className,
  children,
  ...props
}: {
  href: string;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  if (isDiscordHttpsUrl(href)) {
    return (
      <DiscordAppAnchor discordUrl={href} className={className} {...props}>
        {children}
      </DiscordAppAnchor>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}

const SOCIAL_PLATFORM_SVG: Record<SocialPlatform, string> = {
  twitch: "/twitch-tile.svg",
  youtube: "/youtube-tile.svg",
  tiktok: "/tiktok-icon.svg",
  facebook: "/facebook-tile.svg",
  x: "/x-icon.svg",
  instagram: "/instagram-icon.svg",
  discord: "/discord-tile.svg",
};

function MemberProfilePage() {
  const { slug } = Route.useParams();
  const session = getSession();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [championships, setChampionships] = useState<ChampionshipTitle[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);
      setLoadError(null);
      try {
        const data = await fetchMemberProfileBySlug(slug, session?.id);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          setProfile(null);
        } else {
          setProfile(data);
          try {
            const titles = await fetchMemberChampionships(data.memberId);
            if (!cancelled) setChampionships(titles);
          } catch {
            if (!cancelled) setChampionships([]);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load profile.");
        setNotFound(false);
        setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [slug, session?.id]);

  if (loading) return <MemberProfileSkeleton />;

  if (loadError) {
    return (
      <MemberPageLayout maxWidth="max-w-4xl">
        <ArenaEmptyState
          compact
          eyebrow="Load Error"
          title={
            <>
              Could not load <span className="text-stroke">profile.</span>
            </>
          }
          description={loadError}
          actions={
            <Button
              asChild
              variant="outline"
              className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 font-tech text-ui-readable uppercase"
            >
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          }
        />
      </MemberPageLayout>
    );
  }

  if (notFound || !profile) {
    return (
      <MemberPageLayout maxWidth="max-w-4xl">
        <ArenaEmptyState
          compact
          eyebrow="Not Found"
          title={
            <>
              Member <span className="text-stroke">not found.</span>
            </>
          }
          description="This profile may have been removed or the link is incorrect."
          actions={
            <Button
              asChild
              variant="outline"
              className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 font-tech text-ui-readable uppercase"
            >
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          }
        />
      </MemberPageLayout>
    );
  }

  const isOwnProfile = session?.id === profile.memberId;
  const viewerIsVerified = session ? hasFullMemberAccess(session.role) : false;
  const p = profile;

  const publicSocials = SOCIAL_PLATFORM_ORDER.map((platform) =>
    p.socialLinks.find((s) => s.platform === platform),
  ).filter((s): s is NonNullable<typeof s> => !!s && isSocialLinkPublic(s));

  return (
    <MemberPageLayout maxWidth="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          className="-ml-2 rounded-none font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <Link to="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </Button>
        {isOwnProfile && (
          <Button
            asChild
            variant="outline"
            className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase"
          >
            <Link to="/dashboard/profile" search={{ tab: "identity" }}>
              <Pencil className="h-3.5 w-3.5" />
              Edit Profile
            </Link>
          </Button>
        )}
      </div>

      <MemberHeroBanner
        title={p.displayName}
        subtitle={p.headline}
        meta={
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              {p.isVerified && (
                <Badge
                  variant="outline"
                  className="rounded-none border-emerald-400/25 bg-emerald-400/5 font-tech text-label-readable uppercase text-emerald-400"
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              )}
              {p.mainGame && (
                <span className="flex items-center gap-1.5 font-tech text-label-readable uppercase text-muted-foreground">
                  <Gamepad2 className="h-3 w-3" />
                  {p.mainGame}
                </span>
              )}
              {p.region && (
                <span className="flex items-center gap-1.5 font-tech text-label-readable uppercase text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {p.region}
                </span>
              )}
            </div>
            {championships.length > 0 && (
              <ChampionMarkGroup titles={championships} size="md" showLabel />
            )}
          </div>
        }
      >
        <div className="relative shrink-0">
          <MemberAvatar
            avatarUrl={p.avatarUrl}
            initials={p.avatarInitials}
            name={p.displayName}
            className="h-24 w-24 text-3xl"
          />
          {p.isVerified && !isOwnProfile && (
            <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center border border-emerald-400/30 bg-[oklch(0.07_0_0)]">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          )}
        </div>
      </MemberHeroBanner>

      {publicSocials.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 border border-white/8 bg-[oklch(0.07_0_0)] p-4 clip-tab">
          {publicSocials.map((s) => (
            <ProfileExternalLink
              key={s.platform}
              href={s.url!}
              className="group relative inline-flex h-11 items-center gap-2 overflow-hidden border border-white/10 bg-white/5 px-3 transition hover:border-white/20 hover:bg-white/10"
              title={SOCIAL_PLATFORM_LABELS[s.platform]}
              aria-label={SOCIAL_PLATFORM_LABELS[s.platform]}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.12),transparent_55%)]" />
              <div className="relative inline-flex items-center gap-2">
                <img
                  src={SOCIAL_PLATFORM_SVG[s.platform]}
                  alt={`${SOCIAL_PLATFORM_LABELS[s.platform]} logo`}
                  className="h-5 w-5 shrink-0 object-contain"
                  loading="lazy"
                />
                <span className="font-tech text-label-readable uppercase whitespace-nowrap text-foreground">
                  {SOCIAL_PLATFORM_LABELS[s.platform]}
                </span>
              </div>
            </ProfileExternalLink>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {p.bio ? (
            <ProfileCard label="About">
              <p className="text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
            </ProfileCard>
          ) : (
            isOwnProfile && (
              <ProfileCard label="About">
                <ArenaEmptyState
                  compact
                  className="border-0 bg-transparent py-10"
                  eyebrow="About You"
                  title={
                    <>
                      No bio <span className="text-stroke">yet.</span>
                    </>
                  }
                  description="Add a short intro so other members know who you are."
                  actions={
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-none border-white/15 font-tech text-ui-readable uppercase"
                    >
                      <Link to="/dashboard/profile" search={{ tab: "identity" }}>
                        Add Bio
                      </Link>
                    </Button>
                  }
                />
              </ProfileCard>
            )
          )}

          {championships.length > 0 && <ChampionshipTitlesCard titles={championships} />}

          <ProfileCommentsPanel
            profileMemberId={p.memberId}
            isOwnProfile={isOwnProfile}
            viewerMemberId={session?.id}
            viewerIsVerified={viewerIsVerified}
            profileOwner={{
              displayName: p.displayName,
              slug: p.slug,
              discordUsername: p.discordUsername,
              avatarUrl: p.avatarUrl,
              avatarInitials: p.avatarInitials,
            }}
          />

          {p.tournamentHistory.length > 0 && (
            <ProfileCard label="Tournament History">
              <ul className="flex flex-col gap-2">
                {p.tournamentHistory.map((entry, i) => (
                  <li key={entry} className="flex items-center gap-3">
                    <span className="font-display text-sm tracking-display text-muted-foreground/50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-muted-foreground">{entry}</span>
                  </li>
                ))}
              </ul>
            </ProfileCard>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <ProfileCard label="Player Info">
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="font-tech text-label-readable uppercase text-muted-foreground">
                  Main Game
                </dt>
                <dd className="mt-0.5 font-display text-lg tracking-display">
                  {p.mainGame || "—"}
                </dd>
              </div>
              <div className="h-px bg-white/6" />
              <div>
                <dt className="font-tech text-label-readable uppercase text-muted-foreground">
                  Role
                </dt>
                <dd className="mt-0.5 text-sm">{p.mainRole || "—"}</dd>
              </div>
              <div className="h-px bg-white/6" />
              <div>
                <dt className="font-tech text-label-readable uppercase text-muted-foreground">
                  Region
                </dt>
                <dd className="mt-0.5 text-sm">{p.region || "—"}</dd>
              </div>
              <div className="h-px bg-white/6" />
              <div>
                <dt className="font-tech text-label-readable uppercase text-muted-foreground">
                  Valorant ID
                </dt>
                <dd
                  className={`mt-0.5 text-sm ${p.valorantGameName && p.valorantTagline ? "text-emerald-400" : "text-muted-foreground"}`}
                >
                  {p.valorantGameName && p.valorantTagline
                    ? `${p.valorantGameName}#${p.valorantTagline}`
                    : "Not set"}
                </dd>
              </div>
            </dl>
          </ProfileCard>

          <ProfileCard label="Social Links">
            <ul className="flex flex-col gap-2.5">
              {SOCIAL_PLATFORM_ORDER.map((platform) => {
                const link = p.socialLinks.find((s) => s.platform === platform);
                const isPublic = link ? isSocialLinkPublic(link) : false;
                return (
                  <li key={platform} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {SOCIAL_PLATFORM_LABELS[platform]}
                    </span>
                    {isPublic && link?.url ? (
                      <ProfileExternalLink
                        href={link.url}
                        className="inline-flex items-center gap-1.5 font-tech text-ui-readable uppercase text-emerald-400 transition hover:text-emerald-300"
                      >
                        Added
                        <ExternalLink className="h-2.5 w-2.5" />
                      </ProfileExternalLink>
                    ) : (
                      <span className="font-tech text-label-readable uppercase text-muted-foreground/35">
                        {link?.url ? "Private" : "—"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </ProfileCard>
        </div>
      </div>
    </MemberPageLayout>
  );
}
