import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ExternalLink,
  CheckCircle,
  Shield,
  MapPin,
  Gamepad2,
  ArrowLeft,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { ProfileCard } from "@/features/member/components/ProfileCard";
import { MemberProfileSkeleton } from "@/features/member/components/MemberProfileSkeleton";
import {
  MemberHeroBanner,
  MemberPageLayout,
  PanelEmptyState,
} from "@/features/member/components/MemberShell";
import { SOCIAL_PLATFORM_LABELS, SOCIAL_PLATFORM_ORDER } from "@/features/member/constants";
import { getSession } from "@/features/auth/store/session";
import { fetchMemberProfileBySlug } from "@/features/member/services/member-profile.service";
import { fetchMemberChampionships } from "@/features/championships/services/championship.service";
import { ChampionMarkGroup } from "@/features/championships/components/ChampionMarkGroup";
import { ChampionshipTitlesCard } from "@/features/championships/components/ChampionshipTitlesCard";
import type { ChampionshipTitle } from "@/features/championships/types";
import type { MemberProfile } from "@/features/member/types";
import { isSocialLinkPublic } from "@/features/member/utils/social-links";

export const Route = createFileRoute("/members/$slug")({
  head: () => ({
    meta: [{ title: "Member — Black Rose" }],
  }),
  component: MemberProfilePage,
});

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
          const titles = await fetchMemberChampionships(data.memberId);
          if (!cancelled) setChampionships(titles);
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
        <PanelEmptyState
          icon={<AlertCircle className="h-10 w-10" />}
          title="Could not load profile"
          description={loadError}
          action={
            <Button
              asChild
              variant="outline"
              className="clip-cta rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
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
        <PanelEmptyState
          icon={
            <span className="font-display text-5xl tracking-display text-muted-foreground/30">
              404
            </span>
          }
          title="Member not found"
          action={
            <Button
              asChild
              variant="outline"
              className="clip-cta rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
            >
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          }
        />
      </MemberPageLayout>
    );
  }

  const isOwnProfile = session?.id === profile.memberId;
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
          className="-ml-2 rounded-none font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
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
            className="clip-cta rounded-none border-white/15 bg-white/5 font-tech text-[10px] uppercase tracking-wider-2"
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
                  className="rounded-none border-emerald-400/25 bg-emerald-400/5 font-tech text-[9px] uppercase tracking-wider-2 text-emerald-400"
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              )}
              {p.mainGame && (
                <span className="flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                  <Gamepad2 className="h-3 w-3" />
                  {p.mainGame}
                </span>
              )}
              {p.region && (
                <span className="flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {p.region}
                </span>
              )}
              {p.riotAccount?.isLinked && (
                <span className="flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider-2 text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  Riot Linked
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
        <div className="mb-6 flex flex-wrap gap-2 border border-white/8 bg-[oklch(0.07_0_0)] p-4 clip-tab">
          {publicSocials.map((s) => (
            <Button
              key={s.platform}
              asChild
              variant="outline"
              size="sm"
              className="rounded-none border-white/10 bg-white/5 font-tech text-[10px] uppercase tracking-wider-2"
            >
              <a href={s.url!} target="_blank" rel="noopener noreferrer">
                {SOCIAL_PLATFORM_LABELS[s.platform]}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </Button>
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
                <PanelEmptyState
                  icon={<Pencil className="h-5 w-5" />}
                  title="No bio yet"
                  description="Add a short intro so other members know who you are."
                  action={
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="mt-1 rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
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

          {championships.length > 0 && (
            <ChampionshipTitlesCard titles={championships} />
          )}

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
                <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  Main Game
                </dt>
                <dd className="mt-0.5 font-display text-lg tracking-display">
                  {p.mainGame || "—"}
                </dd>
              </div>
              <div className="h-px bg-white/6" />
              <div>
                <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  Role
                </dt>
                <dd className="mt-0.5 text-sm">{p.mainRole || "—"}</dd>
              </div>
              <div className="h-px bg-white/6" />
              <div>
                <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  Region
                </dt>
                <dd className="mt-0.5 text-sm">{p.region || "—"}</dd>
              </div>
              <div className="h-px bg-white/6" />
              <div>
                <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  Riot Account
                </dt>
                <dd
                  className={`mt-0.5 text-sm ${p.riotAccount?.isLinked ? "text-emerald-400" : "text-muted-foreground"}`}
                >
                  {p.riotAccount?.isLinked
                    ? `${p.riotAccount.gameName}#${p.riotAccount.tagline}`
                    : "Not Linked"}
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
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider-2 text-emerald-400 transition hover:text-emerald-300"
                      >
                        Added
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground/35">
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
