import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  User,
  Gamepad2,
  Share2,
  Eye,
  Sparkles,
} from "lucide-react";
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
import { GameIdentitiesFields } from "@/features/member/components/GameIdentitiesFields";
import { MemberDashboardSkeleton } from "@/features/member/components/MemberDashboardSkeleton";
import { useSyncedMemberSession } from "@/features/auth/hooks/useSyncedMemberSession";
import { setSession } from "@/features/auth/store/session";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import { useMemberProfileQuery } from "@/features/member/queries/member-profile-queries";
import { queryKeys } from "@/lib/query-keys";
import {
  PROFILE_GAME_OPTIONS,
  PROFILE_REGION_OPTIONS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORM_ORDER,
} from "@/features/member/constants";
import { updateMemberProfile } from "@/features/member/services/member-profile.service";
import {
  profileCompletionHint,
  isProfileComplete,
} from "@/features/member/utils/profile-completion";
import { ProfileCompleteCelebrationDialog } from "@/features/member/components/ProfileCompleteCelebrationDialog";
import { useProfileCompleteCelebration } from "@/features/member/hooks/useProfileCompleteCelebration";
import type { MemberProfile, SocialPlatform } from "@/features/member/types";
import { getRoleOptionsForGame, normalizeGameKey } from "@/features/teams/constants";
import { sanitizeHttpUrl } from "@/features/member/utils/validate-social-url";
import { validateGameIdentitiesInput } from "@/features/member/utils/game-identity";
import { cn } from "@/lib/utils";

type ProfileTab = "identity" | "player" | "socials" | "privacy";

export const Route = createFileRoute("/dashboard/profile")({
  validateSearch: (search: Record<string, unknown>) => {
    const tab = search.tab as string | undefined;
    const normalizedTab = tab === "ingame" ? "player" : tab;
    const valid: ProfileTab[] = ["identity", "player", "socials", "privacy"];
    const focusGame = typeof search.focusGame === "string" ? search.focusGame : undefined;
    return {
      tab: valid.includes(normalizedTab as ProfileTab) ? (normalizedTab as ProfileTab) : "identity",
      ...(focusGame ? { focusGame } : {}),
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
  discordUsername: "",
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
  valorantGameName: "",
  valorantTagline: "",
  gameIdentities: {},
  ingameDisplayName: "",
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

function applyProfileToForm(
  data: MemberProfile,
  setters: {
    setDisplayName: (v: string) => void;
    setHeadline: (v: string) => void;
    setBio: (v: string) => void;
    setMainGame: (v: string) => void;
    setMainRole: (v: string) => void;
    setRegion: (v: string) => void;
    setValorantGameName: (v: string) => void;
    setValorantTagline: (v: string) => void;
    setGameIdentities: (v: Record<string, string>) => void;
    setIsPublic: (v: boolean) => void;
    setSocials: (v: SocialFormState) => void;
  },
): void {
  const normalizedGame = normalizeGameKey(data.mainGame) ?? "";
  setters.setDisplayName(data.displayName);
  setters.setHeadline(data.headline);
  setters.setBio(data.bio);
  setters.setMainGame(normalizedGame);
  setters.setMainRole(data.mainRole);
  setters.setRegion(data.region.trim());
  setters.setValorantGameName(data.valorantGameName);
  setters.setValorantTagline(data.valorantTagline);
  setters.setGameIdentities(data.gameIdentities);
  setters.setIsPublic(data.isPublic);
  setters.setSocials(socialsFromProfile(data));
}

function ProfileEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tab, focusGame } = Route.useSearch();
  const { session, isSyncing } = useSyncedMemberSession();
  const memberId = session?.id;
  const profileQuery = useMemberProfileQuery(memberId);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [formInitialized, setFormInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [mainGame, setMainGame] = useState("");
  const [mainRole, setMainRole] = useState("");
  const [region, setRegion] = useState("");
  const [valorantGameName, setValorantGameName] = useState("");
  const [valorantTagline, setValorantTagline] = useState("");
  const [gameIdentities, setGameIdentities] = useState<Record<string, string>>({});
  const [isPublic, setIsPublic] = useState(true);
  const [socials, setSocials] = useState<SocialFormState>(() => socialsFromProfile(EMPTY_PROFILE));
  const { celebrationOpen, maybeCelebrate, dismissCelebration } =
    useProfileCompleteCelebration(memberId);

  const roleOptions = useMemo(() => getRoleOptionsForGame(mainGame), [mainGame]);

  const normalizedRegion = region.trim();

  const regionOptions = useMemo(() => {
    if (
      normalizedRegion &&
      !PROFILE_REGION_OPTIONS.includes(normalizedRegion as (typeof PROFILE_REGION_OPTIONS)[number])
    ) {
      return [...PROFILE_REGION_OPTIONS, normalizedRegion];
    }
    return PROFILE_REGION_OPTIONS;
  }, [normalizedRegion]);

  useEffect(() => {
    if (mainRole && !roleOptions.includes(mainRole as (typeof roleOptions)[number])) {
      setMainRole("");
    }
  }, [mainRole, roleOptions]);

  useEffect(() => {
    setFormInitialized(false);
    setProfile(null);
  }, [memberId]);

  useEffect(() => {
    if (!profileQuery.data || formInitialized) return;

    const data = profileQuery.data;
    setProfile(data);
    applyProfileToForm(data, {
      setDisplayName,
      setHeadline,
      setBio,
      setMainGame,
      setMainRole,
      setRegion,
      setValorantGameName,
      setValorantTagline,
      setGameIdentities,
      setIsPublic,
      setSocials,
    });
    setFormInitialized(true);
  }, [profileQuery.data, formInitialized]);

  useEffect(() => {
    if (profileQuery.isError && !formInitialized) {
      setError(
        profileQuery.error instanceof Error
          ? profileQuery.error.message
          : "Failed to load profile.",
      );
    }
  }, [profileQuery.isError, profileQuery.error, formInitialized]);

  useEffect(() => {
    if (profileQuery.isSuccess && !profileQuery.data && !formInitialized) {
      setError("Profile not found. Try signing in again.");
    }
  }, [profileQuery.isSuccess, profileQuery.data, formInitialized]);

  const loading = isSyncing || profileQuery.isPending;

  if (!session || !hasFullMemberAccess(session.role)) return null;
  if (loading) return <MemberDashboardSkeleton />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !profile) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    const identityError = validateGameIdentitiesInput({
      valorantGameName,
      valorantTagline,
      gameIdentities,
    });
    if (identityError) {
      setSaving(false);
      setError(identityError);
      return;
    }

    try {
      const previousCompletion = profile.profileCompletion;
      const updated = await updateMemberProfile({
        memberId: session.id,
        displayName,
        headline,
        bio,
        mainGame: mainGame || null,
        mainRole,
        region,
        valorantGameName,
        valorantTagline,
        gameIdentities,
        isPublic,
        socialLinks: SOCIAL_PLATFORM_ORDER.map((platform) => ({
          platform,
          url: sanitizeHttpUrl(socials[platform].url),
          isPublic: socials[platform].isPublic,
        })),
      });

      setProfile(updated);
      setSocials(socialsFromProfile(updated));
      queryClient.setQueryData(queryKeys.memberProfile(session.id), updated);
      maybeCelebrate(previousCompletion, updated.profileCompletion);
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
        className="touch-target mb-6 -ml-2 inline-flex min-h-11 items-center rounded-none font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground"
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
        emblemSize="h-40 w-40 sm:h-56 sm:w-56"
        meta={
          profile && (
            <div className="max-w-xs">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{completion}% complete</span>
                {isProfileComplete(completion) && (
                  <span className="inline-flex items-center gap-1 text-emerald-400/90">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Arena ready
                  </span>
                )}
              </div>
              <Progress
                value={completion}
                className={cn(
                  "h-1 rounded-none bg-white/10 [&>div]:rounded-none",
                  isProfileComplete(completion) ? "[&>div]:bg-emerald-400" : "[&>div]:bg-white",
                )}
              />
            </div>
          )
        }
        actions={
          profile && (
            <Button
              asChild
              variant="outline"
              className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase"
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
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border border-white/8 bg-[oklch(0.07_0_0)] p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger
              value="identity"
              className="min-h-11 shrink-0 flex-none rounded-none px-4 font-tech text-ui-readable uppercase data-[state=active]:bg-white/10 data-[state=active]:text-foreground sm:flex-1"
            >
              <User className="mr-1.5 h-3.5 w-3.5" />
              Identity
            </TabsTrigger>
            <TabsTrigger
              value="player"
              className="min-h-11 shrink-0 flex-none rounded-none px-4 font-tech text-ui-readable uppercase data-[state=active]:bg-white/10 data-[state=active]:text-foreground sm:flex-1"
            >
              <Gamepad2 className="mr-1.5 h-3.5 w-3.5" />
              Player
            </TabsTrigger>
            <TabsTrigger
              value="socials"
              className="min-h-11 shrink-0 flex-none rounded-none px-4 font-tech text-ui-readable uppercase data-[state=active]:bg-white/10 data-[state=active]:text-foreground sm:flex-1"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Socials
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="min-h-11 shrink-0 flex-none rounded-none px-4 font-tech text-ui-readable uppercase data-[state=active]:bg-white/10 data-[state=active]:text-foreground sm:flex-1"
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
                <Label className="font-tech text-label-readable uppercase text-muted-foreground">
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
                <Label className="font-tech text-label-readable uppercase text-muted-foreground">
                  Headline
                </Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Valorant Duelist · Black Rose Member"
                  className={techFieldClass}
                />
                <p className="text-sm text-muted-foreground/60">
                  Shown under your name on your public profile.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-tech text-label-readable uppercase text-muted-foreground">
                  Bio
                </Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  placeholder="Tell the community about yourself…"
                  className={cn(
                    techFieldClass,
                    "custom-scrollbar max-h-48 resize-y overflow-y-auto",
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Any bio text counts toward profile completion.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="player" className="mt-0">
            <TechPanel label="Competitive" title="Player Info">
              <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
                Your main game determines which in-game identity fields appear below for rosters and
                brackets.
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-tech text-label-readable uppercase text-muted-foreground">
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
                  <Label className="font-tech text-label-readable uppercase text-muted-foreground">
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
                  <Label className="font-tech text-label-readable uppercase text-muted-foreground">
                    Region
                  </Label>
                  <Select value={normalizedRegion || undefined} onValueChange={setRegion}>
                    <SelectTrigger className={techFieldClass}>
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-white/12 bg-[oklch(0.1_0_0)]">
                      {regionOptions.map((option) => (
                        <SelectItem key={option} value={option} className="font-tech text-xs">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TechPanel>

            <GameIdentitiesFields
              mainGame={mainGame}
              focusGame={focusGame}
              valorantGameName={valorantGameName}
              valorantTagline={valorantTagline}
              gameIdentities={gameIdentities}
              onValorantGameNameChange={setValorantGameName}
              onValorantTaglineChange={setValorantTagline}
              onGameIdentityChange={(game, value) =>
                setGameIdentities((prev) => ({ ...prev, [game]: value }))
              }
            />
          </TabsContent>

          <TabsContent value="socials" className="mt-0">
            <TechPanel label="Links" title="Social Profiles" noPadding>
              <ul className="divide-y divide-white/6">
                {SOCIAL_PLATFORM_ORDER.map((platform) => (
                  <li
                    key={platform}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <span className="w-36 shrink-0 font-tech text-label-readable uppercase text-muted-foreground">
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
                      <span className="font-tech text-label-readable uppercase text-muted-foreground">
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <Separator className="my-8 hidden bg-white/8 lg:block" />

        <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex flex-wrap items-center gap-3 border-t border-white/8 bg-background/95 px-4 py-4 backdrop-blur-md safe-bottom sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <Button
            type="submit"
            disabled={saving || !profile}
            className="clip-cta h-11 w-full rounded-none bg-white px-8 font-tech text-ui-readable uppercase text-black hover:bg-white/90 sm:w-auto"
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
          {error && <p className="w-full text-sm text-red-400 sm:w-auto">{error}</p>}
        </div>
      </form>

      {profile && (
        <ProfileCompleteCelebrationDialog
          open={celebrationOpen}
          displayName={profile.displayName}
          avatarUrl={profile.avatarUrl}
          avatarInitials={profile.avatarInitials}
          profileSlug={profile.slug}
          onDismiss={dismissCelebration}
        />
      )}
    </MemberPageLayout>
  );
}
