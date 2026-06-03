import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ExternalLink, CheckCircle, Shield, MapPin, Gamepad2, ArrowLeft } from "lucide-react";
import { MemberNav } from "@/features/member/components/MemberNav";
import { Emblem } from "@/features/shared/components/Emblem";
import { AvatarUpload } from "@/features/member/components/AvatarUpload";
import { getSavedAvatar, saveAvatar, removeAvatar } from "@/features/member/store/avatar";
import { getMemberBySlug } from "@/lib/mock-member";
import { ProfileCard } from "@/features/member/components/ProfileCard";
import { SOCIAL_PLATFORM_LABELS, SOCIAL_PLATFORM_ORDER } from "@/features/member/constants";
import { getSession } from "@/features/auth/store/session";
import type { MemberProfile } from "@/features/member/types";
export const Route = createFileRoute("/members/$slug")({
  loader: ({ params }): { profile: MemberProfile } => {
    const profile = getMemberBySlug(params.slug);
    if (!profile) throw notFound();
    return { profile };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.profile?.displayName ?? "Member"} — Black Rose` },
      {
        name: "description",
        content: loaderData?.profile?.headline ?? "Black Rose Verified Member",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p className="font-display text-5xl tracking-display">404</p>
      <p className="text-muted-foreground">Member not found.</p>
      <Link
        to="/dashboard"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to Dashboard
      </Link>
    </div>
  ),
  component: MemberProfilePage,
});

function MemberProfilePage() {
  const { profile: p } = Route.useLoaderData();
  const session = getSession();
  const isOwnProfile = session?.username === p.username;

  // Load persisted avatar from localStorage on own profile
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    isOwnProfile ? getSavedAvatar() : p.avatarUrl,
  );

  useEffect(() => {
    setAvatarUrl(isOwnProfile ? getSavedAvatar() : p.avatarUrl);
  }, [isOwnProfile, p.slug, p.avatarUrl]);

  function handleAvatarChange(dataUrl: string) {
    saveAvatar(dataUrl);
    setAvatarUrl(dataUrl);
  }

  function handleAvatarRemove() {
    removeAvatar();
    setAvatarUrl(null);
  }

  const publicSocials = SOCIAL_PLATFORM_ORDER.map((platform) =>
    p.socialLinks.find((s) => s.platform === platform),
  ).filter((s): s is NonNullable<typeof s> => !!s && !!s.url && s.isPublic);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MemberNav />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-25" />

      <main className="relative mx-auto max-w-4xl px-6 pt-24 pb-10">
        {/* Back nav */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          {isOwnProfile && (
            <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/50">
              Viewing your public profile
            </span>
          )}
        </div>

        {/* ── Banner card ─────────────────────────────────────── */}
        <div className="relative mb-5 overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)]">
          {/* Banner background — grid + radial */}
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-70" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_80%_60%_at_30%_50%,rgba(255,255,255,0.03),transparent)]" />

          {/* Decorative emblem */}
          <div className="pointer-events-none absolute -right-16 -top-16 opacity-[0.06]">
            <Emblem className="h-72 w-72" spin />
          </div>

          <div className="relative px-8 py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Avatar — editable on own profile */}
              <div className="relative shrink-0">
                <AvatarUpload
                  avatarUrl={avatarUrl}
                  initials={p.avatarInitials}
                  onChange={handleAvatarChange}
                  onRemove={handleAvatarRemove}
                  editable={isOwnProfile}
                />
                {p.isVerified && !isOwnProfile && (
                  <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center border border-emerald-400/30 bg-[oklch(0.07_0_0)]">
                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                )}
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="font-display text-4xl tracking-display sm:text-5xl leading-none">
                    {p.displayName}
                  </h1>
                  {p.isVerified && (
                    <span className="inline-flex items-center gap-1.5 border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[10px] font-tech uppercase tracking-wider-2 text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{p.headline}</p>

                {/* Inline meta */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Gamepad2 className="h-3 w-3" />
                    {p.mainGame}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {p.region}
                  </span>
                  {p.riotAccount?.isLinked && (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      Riot Linked
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Social chips */}
            {publicSocials.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-white/8 pt-5">
                {publicSocials.map((s) => (
                  <a
                    key={s.platform}
                    href={s.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 border border-white/10 bg-white/5 px-3 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
                  >
                    {SOCIAL_PLATFORM_LABELS[s.platform]}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Content grid ────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left col — bio + history */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            {/* Bio */}
            {p.bio && (
              <ProfileCard label="About">
                <p className="text-sm text-muted-foreground leading-relaxed">{p.bio}</p>
              </ProfileCard>
            )}

            {/* Tournament History */}
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

          {/* Right col — stats + socials */}
          <div className="flex flex-col gap-5">
            {/* Quick stats */}
            <ProfileCard label="Player Info">
              <dl className="flex flex-col gap-3">
                <div>
                  <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Main Game
                  </dt>
                  <dd className="mt-0.5 font-display text-lg tracking-display">{p.mainGame}</dd>
                </div>
                <div className="h-px bg-white/6" />
                <div>
                  <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Role
                  </dt>
                  <dd className="mt-0.5 text-sm">{p.mainRole}</dd>
                </div>
                <div className="h-px bg-white/6" />
                <div>
                  <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Region
                  </dt>
                  <dd className="mt-0.5 text-sm">{p.region}</dd>
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

            {/* Social links full list */}
            <ProfileCard label="Social Links">
              <ul className="flex flex-col gap-2.5">
                {SOCIAL_PLATFORM_ORDER.map((platform) => {
                  const link = p.socialLinks.find((s) => s.platform === platform);
                  const isPublic = link?.url && link.isPublic;
                  return (
                    <li key={platform} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {SOCIAL_PLATFORM_LABELS[platform]}
                      </span>
                      {isPublic ? (
                        <a
                          href={link.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-emerald-400 transition hover:text-emerald-300"
                        >
                          Added
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/35">
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
      </main>
    </div>
  );
}

// ── Internal helpers ──────────────────────────────────────────────────────────
