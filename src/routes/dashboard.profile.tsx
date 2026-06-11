import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Loader2, User, Gamepad2, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import {
  MemberHeroBanner,
  MemberPageLayout,
  TechPanel,
  techFieldClass,
} from "@/features/member/components/MemberShell";
import { MemberDashboardSkeleton } from "@/features/member/components/MemberDashboardSkeleton";
import { getSession, setSession } from "@/features/auth/store/session";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import {
  PROFILE_GAME_OPTIONS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORM_ORDER,
} from "@/features/member/constants";
import {
  fetchMemberProfileById,
  updateMemberProfile,
} from "@/features/member/services/member-profile.service";
import { profileCompletionHint } from "@/features/member/utils/profile-completion";
import type { MemberProfile, SocialPlatform } from "@/features/member/types";
import { getRoleOptionsForGame, normalizeGameKey } from "@/features/teams/constants";
import { sanitizeHttpUrl } from "@/features/member/utils/validate-social-url";
import { cn } from "@/lib/utils";

type ProfileTab = "identity" | "player" | "socials" | "privacy";

export const Route = createFileRoute("/dashboard/profile")({
  validateSearch: (search: Record<string, unknown>) => {
    const tab = search.tab as string | undefined;
    const valid: ProfileTab[] = ["identity", "player", "socials", "privacy"];
    return {
      tab: valid.includes(tab as ProfileTab) ? (tab as ProfileTab) : "identity",
    };
  },
  head: () => ({
    meta: [{ title: "Edit Profile — Black Rose" }],
  }),
  component: ProfileEditPage,
});

type SocialFormState = Record<SocialPlatform, { url: string; isPublic: boolean }>;

const EMPTY_PROFILE: MemberProfile = {
  memberId: "",
  slug: "",
  displayName: "",
  username: "",
  headline: "",
  bio: "",
  avatarInitials: "",
  avatarUrl: null,
  mainGame: "",
  mainRole: "",
  region: "",
  isVerified: false,
  isPublic: true,
  socialLinks: [],
  riotAccount: null,
  tournamentHistory: [],
  activeRegistrations: [],
  upcomingMatches: [],
  profileCompletion: 0,
};

function socialsFromProfile(profile: MemberProfile): SocialFormState {
  const state = {} as SocialFormState;
  for (const platform of SOCIAL_PLATFORM_ORDER) {
    const link = profile.socialLinks.find((s) => s.platform === platform);
    state[platform] = {
      url: link?.url ?? "",
      isPublic: link?.isPublic ?? true,
    };
  }
  return state;
}

function ProfileEditPage() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const session = getSession();
  const memberId = session?.id;
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [mainGame, setMainGame] = useState("");
  const [mainRole, setMainRole] = useState("");
  const [region, setRegion] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [socials, setSocials] = useState<SocialFormState>(() => socialsFromProfile(EMPTY_PROFILE));

  const roleOptions = useMemo(() => getRoleOptionsForGame(mainGame), [mainGame]);

  useEffect(() => {
    if (mainRole && !roleOptions.includes(mainRole as (typeof roleOptions)[number])) {
      setMainRole("");
    }
  }, [mainRole, roleOptions]);

  useEffect(() => {
    if (!memberId) {
      navigate({ to: "/login" });
      return;
    }

    const currentSession = getSession();
    if (!currentSession || !hasFullMemberAccess(currentSession.role)) {
      navigate({ to: "/waitlist" });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await fetchMemberProfileById(memberId);
        if (cancelled) return;
        if (!data) {
          setError("Profile not found. Try signing in again.");
          return;
        }

        const normalizedGame = normalizeGameKey(data.mainGame) ?? "";

        setProfile(data);
        setDisplayName(data.displayName);
        setHeadline(data.headline);
        setBio(data.bio);
        setMainGame(normalizedGame);
        setMainRole(data.mainRole);
        setRegion(data.region);
        setIsPublic(data.isPublic);
        setSocials(socialsFromProfile(data));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [navigate, memberId]);

  if (!session || !hasFullMemberAccess(session.role)) return null;
  if (loading) return <MemberDashboardSkeleton />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !profile) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const updated = await updateMemberProfile({
        memberId: session.id,
        displayName,
        headline,
        bio,
        mainGame: mainGame || null,
        mainRole,
        region,
        isPublic,
        socialLinks: SOCIAL_PLATFORM_ORDER.map((platform) => ({
          platform,
          url: sanitizeHttpUrl(socials[platform].url),
          isPublic: socials[platform].isPublic,
        })),
      });

      setProfile(updated);
      setSocials(socialsFromProfile(updated));
      setSession({
        ...session,
        displayName: updated.displayName,
        discordUsername: updated.discordUsername,
        avatarUrl: updated.avatarUrl,
        profileSlug: updated.slug,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const completion = profile?.profileCompletion ?? 0;

  if (error && !profile) {
    return (
      <MemberPageLayout maxWidth="max-w-3xl">
        <p className="text-sm text-red-400">{error}</p>
      </MemberPageLayout>
    );
  }

  return (
    <MemberPageLayout maxWidth="max-w-3xl">
      <Button
        asChild
        variant="ghost"
        className="mb-6 -ml-2 rounded-none font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        <Link to="/dashboard">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </Button>

      <MemberHeroBanner
        eyebrow="Member Profile"
        title="Edit Profile"
        subtitle={profile ? profileCompletionHint(completion) : undefined}
        emblemSize="h-56 w-56"
        meta={
          profile && (
            <div className="max-w-xs">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{completion}% complete</span>
              </div>
              <Progress
                value={completion}
                className="h-1 rounded-none bg-white/10 [&>div]:rounded-none [&>div]:bg-white"
              />
            </div>
          )
        }
        actions={
          profile && (
            <Button
              asChild
              variant="outline"
              className="clip-cta rounded-none border-white/15 bg-white/5 font-tech text-[10px] uppercase tracking-wider-2"
            >
              <Link to="/members/$slug" params={{ slug: profile.slug }}>
                Preview
              </Link>
            </Button>
          )
        }
      />

      <form onSubmit={handleSubmit}>
        <Tabs
          value={tab}
          onValueChange={(v) =>
            navigate({ to: "/dashboard/profile", search: { tab: v as ProfileTab } })
          }
          className="gap-6"
        >
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border border-white/8 bg-[oklch(0.07_0_0)] p-1">
            <TabsTrigger
              value="identity"
              className="flex-1 rounded-none font-tech text-[10px] uppercase tracking-wider-2 data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
            >
              <User className="mr-1.5 h-3.5 w-3.5" />
              Identity
            </TabsTrigger>
            <TabsTrigger
              value="player"
              className="flex-1 rounded-none font-tech text-[10px] uppercase tracking-wider-2 data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
            >
              <Gamepad2 className="mr-1.5 h-3.5 w-3.5" />
              Player
            </TabsTrigger>
            <TabsTrigger
              value="socials"
              className="flex-1 rounded-none font-tech text-[10px] uppercase tracking-wider-2 data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Socials
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="flex-1 rounded-none font-tech text-[10px] uppercase tracking-wider-2 data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="mt-0">
            <TechPanel label="Photo" title="Avatar">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <MemberAvatar
                  avatarUrl={profile?.avatarUrl ?? null}
                  initials={displayName.slice(0, 2).toUpperCase() || "BR"}
                  className="h-24 w-24 shrink-0 text-3xl"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your avatar comes from Discord and updates when you sign in again.
                </p>
              </div>
            </TechPanel>

            <div className="mt-5 grid gap-5">
              <div className="space-y-2">
                <Label className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                  Display Name
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className={techFieldClass}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                  Headline
                </Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Valorant Duelist · Black Rose Member"
                  className={techFieldClass}
                />
                <p className="text-[10px] text-muted-foreground/60">
                  Shown under your name on your public profile.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                  Bio
                </Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  placeholder="Tell the community about yourself..."
                  className={techFieldClass}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="player" className="mt-0">
            <TechPanel label="Competitive" title="Player Info">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                    Main Game
                  </Label>
                  <Select value={mainGame || undefined} onValueChange={setMainGame}>
                    <SelectTrigger className={techFieldClass}>
                      <SelectValue placeholder="Select a game" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-white/12 bg-[oklch(0.1_0_0)]">
                      {PROFILE_GAME_OPTIONS.map((game) => (
                        <SelectItem key={game} value={game} className="font-tech text-xs">
                          {game}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                    Main Role
                  </Label>
                  <Select
                    key={mainGame || "no-game"}
                    value={mainRole || undefined}
                    onValueChange={setMainRole}
                    disabled={!mainGame}
                  >
                    <SelectTrigger className={techFieldClass}>
                      <SelectValue
                        placeholder={mainGame ? "Select a role" : "Select a game first"}
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-white/12 bg-[oklch(0.1_0_0)]">
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role} className="font-tech text-xs">
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                    Region
                  </Label>
                  <Input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="PH / APAC"
                    className={techFieldClass}
                  />
                </div>
              </div>
            </TechPanel>
          </TabsContent>

          <TabsContent value="socials" className="mt-0">
            <TechPanel label="Links" title="Social Profiles" noPadding>
              <ul className="divide-y divide-white/6">
                {SOCIAL_PLATFORM_ORDER.map((platform) => (
                  <li
                    key={platform}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <span className="w-36 shrink-0 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
                      {SOCIAL_PLATFORM_LABELS[platform]}
                    </span>
                    <Input
                      value={socials[platform].url}
                      onChange={(e) =>
                        setSocials((s) => ({
                          ...s,
                          [platform]: { ...s[platform], url: e.target.value },
                        }))
                      }
                      placeholder="https://"
                      className={cn(techFieldClass, "flex-1")}
                    />
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={socials[platform].isPublic}
                        disabled={!socials[platform].url.trim()}
                        onCheckedChange={(checked) =>
                          setSocials((s) => ({
                            ...s,
                            [platform]: { ...s[platform], isPublic: checked },
                          }))
                        }
                      />
                      <span className="font-tech text-[9px] uppercase tracking-wider-2 text-muted-foreground">
                        Public
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </TechPanel>
          </TabsContent>

          <TabsContent value="privacy" className="mt-0">
            <TechPanel label="Visibility" title="Profile Access">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Public profile</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    When off, only you can view your profile at /members/your-slug.
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </TechPanel>
          </TabsContent>
        </Tabs>

        <Separator className="my-8 bg-white/8" />

        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="submit"
            disabled={saving || !profile}
            className="clip-cta h-11 rounded-none bg-white px-8 font-tech text-[10px] uppercase tracking-wider-2 text-black hover:bg-white/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Profile
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </form>
    </MemberPageLayout>
  );
}
