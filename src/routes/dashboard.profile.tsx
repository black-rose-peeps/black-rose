import {
  createFileRoute,
  Link,
  redirect,
  useBlocker,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { legacyProfileGamesSearch } from "@/features/shared/utils/hub-search";
import { MemberSelect } from "@/features/member/components/MemberSelect";
import { ArrowLeft, User, Share2, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import {
  MemberHeroBanner,
  MemberPageLayout,
  TechPanel,
  techFieldClass,
} from "@/features/member/components/MemberShell";
import { ProfileEditorActions } from "@/features/member/components/ProfileEditorActions";
import { MemberDashboardSkeleton } from "@/features/member/components/MemberDashboardSkeleton";
import { useSyncedMemberSession } from "@/features/auth/hooks/useSyncedMemberSession";
import { setSession } from "@/features/auth/store/session";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import { useMemberProfileQuery } from "@/features/member/queries/member-profile-queries";

import { queryKeys } from "@/lib/query-keys";
import {
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

import { sanitizeHttpUrl } from "@/features/member/utils/validate-social-url";

import {
  profileFormStateFromMember,
  socialsFromProfile,
  type ProfileSocialFormState,
} from "@/features/member/utils/profile-form-state";
import { resolveProfileMainGame } from "@/features/member/utils/profile-main-game";
import { cn } from "@/lib/utils";
import {
  profileEditorHasChanges,
  shouldGuardProfileExit,
} from "@/features/member/utils/profile-editor";
import type { QueryClient } from "@tanstack/react-query";

type ProfileTab = "identity" | "player" | "socials" | "privacy";

function isProfileEditPath(path: string): boolean {
  return path.replace(/\/+$/, "") === "/dashboard/profile";
}

function normalizeProfilePath(path: string): string {
  return path.replace(/\/+$/, "") || path;
}

function readCachedProfileForm(memberId: string | undefined, queryClient: QueryClient) {
  if (!memberId) return null;
  const cached = queryClient.getQueryData<MemberProfile>(queryKeys.memberProfile(memberId));
  return cached ? profileFormStateFromMember(cached) : null;
}

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
  beforeLoad: ({ search }) => {
    const destination = legacyProfileGamesSearch(search);
    if (destination) throw redirect({ to: "/dashboard", search: destination, replace: true });
  },
  component: ProfileEditPage,
});

type SocialFormState = ProfileSocialFormState;

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
  const form = profileFormStateFromMember(data);
  setters.setDisplayName(form.displayName);
  setters.setHeadline(form.headline);
  setters.setBio(form.bio);
  setters.setMainGame(form.mainGame);
  setters.setMainRole(form.mainRole);
  setters.setRegion(form.region);
  setters.setValorantGameName(form.valorantGameName);
  setters.setValorantTagline(form.valorantTagline);
  setters.setGameIdentities({ ...form.gameIdentities });
  setters.setIsPublic(form.isPublic);
  setters.setSocials(form.socials);
}

function ProfileEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tab, focusGame } = Route.useSearch();
  const { session, isSyncing } = useSyncedMemberSession();
  const memberId = session?.id;
  const profileQuery = useMemberProfileQuery(memberId);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const lastHydratedPathRef = useRef<string | null>(null);
  const lastSyncedDataUpdatedAtRef = useRef<number | null>(null);
  const isDirtyRef = useRef(false);
  const prevMemberIdRef = useRef<string | undefined>(undefined);
  const cachedForm = readCachedProfileForm(memberId, queryClient);
  const [profile, setProfile] = useState<MemberProfile | null>(
    () => queryClient.getQueryData<MemberProfile>(queryKeys.memberProfile(memberId ?? "")) ?? null,
  );
  const [formInitialized, setFormInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(() => cachedForm?.displayName ?? "");
  const [headline, setHeadline] = useState(() => cachedForm?.headline ?? "");
  const [bio, setBio] = useState(() => cachedForm?.bio ?? "");
  const [mainGame, setMainGame] = useState(() => cachedForm?.mainGame ?? "");
  const [mainRole, setMainRole] = useState(() => cachedForm?.mainRole ?? "");
  const [region, setRegion] = useState(() => cachedForm?.region ?? "");
  const [valorantGameName, setValorantGameName] = useState(
    () => cachedForm?.valorantGameName ?? "",
  );
  const [valorantTagline, setValorantTagline] = useState(() => cachedForm?.valorantTagline ?? "");
  const [gameIdentities, setGameIdentities] = useState<Record<string, string>>(
    () => cachedForm?.gameIdentities ?? {},
  );
  const [isPublic, setIsPublic] = useState(() => cachedForm?.isPublic ?? true);
  const [socials, setSocials] = useState<SocialFormState>(
    () => cachedForm?.socials ?? socialsFromProfile(EMPTY_PROFILE),
  );
  const { celebrationOpen, maybeCelebrate, dismissCelebration } =
    useProfileCompleteCelebration(memberId);

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

  const dirty =
    formInitialized &&
    Boolean(
      profile &&
      profileEditorHasChanges(profileFormStateFromMember(profile), {
        displayName,
        headline,
        bio,
        mainGame,
        mainRole,
        region,
        valorantGameName,
        valorantTagline,
        gameIdentities,
        isPublic,
        socials,
      }),
    );

  useLayoutEffect(() => {
    isDirtyRef.current = dirty;
  }, [dirty]);

  useBlocker({
    shouldBlockFn: ({ next }) =>
      (shouldGuardProfileExit(isDirtyRef.current || saving, next.pathname) ||
        ((isDirtyRef.current || saving) && Boolean(legacyProfileGamesSearch(next.search)))) &&
      !window.confirm("Discard your unsaved profile changes and leave?"),
    enableBeforeUnload: () => isDirtyRef.current || saving,
  });

  useEffect(() => {
    if (prevMemberIdRef.current === undefined) {
      prevMemberIdRef.current = memberId;
      return;
    }
    if (prevMemberIdRef.current === memberId) return;

    prevMemberIdRef.current = memberId;
    lastHydratedPathRef.current = null;
    lastSyncedDataUpdatedAtRef.current = null;
    isDirtyRef.current = false;
    setFormInitialized(false);
  }, [memberId]);

  useEffect(() => {
    if (!isProfileEditPath(pathname)) {
      lastHydratedPathRef.current = null;
    }
  }, [pathname]);

  useLayoutEffect(() => {
    if (!profileQuery.data || !isProfileEditPath(pathname)) return;

    const normalizedPath = normalizeProfilePath(pathname);
    const enteredProfile = lastHydratedPathRef.current !== normalizedPath;
    const dataUpdatedAt = profileQuery.dataUpdatedAt;
    const dataChanged = lastSyncedDataUpdatedAtRef.current !== dataUpdatedAt;
    const savedMainGame = resolveProfileMainGame(profileQuery.data.mainGame);
    const formMissingSavedMainGame =
      !isDirtyRef.current && Boolean(savedMainGame && !resolveProfileMainGame(mainGame));
    const shouldSync =
      enteredProfile ||
      !formInitialized ||
      formMissingSavedMainGame ||
      (dataChanged && !isDirtyRef.current);

    if (!shouldSync) return;

    applyProfileToForm(profileQuery.data, {
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
    setProfile(profileQuery.data);
    setFormInitialized(true);
    lastHydratedPathRef.current = normalizedPath;
    lastSyncedDataUpdatedAtRef.current = dataUpdatedAt;
    if (enteredProfile) isDirtyRef.current = false;
  }, [
    pathname,
    profileQuery.data,
    profileQuery.dataUpdatedAt,
    formInitialized,
    memberId,
    mainGame,
  ]);

  const markDirty = () => {
    isDirtyRef.current = true;
    setSaved(false);
    setError(null);
  };

  function discardChanges() {
    if (!profile || !dirty || saving) return;
    if (!window.confirm("Discard all unsaved profile changes?")) return;
    applyProfileToForm(profile, {
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
    isDirtyRef.current = false;
    setSaved(false);
    setError(null);
  }

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

  const loading = isSyncing || (profileQuery.isPending && !profileQuery.data);

  if (!session || !hasFullMemberAccess(session.role)) return null;
  if (loading) return <MemberDashboardSkeleton />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const profileSnapshot = profile ?? profileQuery.data;
    if (!session || !profileSnapshot || saving || !dirty) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const previousCompletion = profileSnapshot.profileCompletion;
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
      applyProfileToForm(updated, {
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
      queryClient.setQueryData(queryKeys.memberProfile(session.id), updated);
      lastSyncedDataUpdatedAtRef.current =
        queryClient.getQueryState(queryKeys.memberProfile(session.id))?.dataUpdatedAt ?? null;
      isDirtyRef.current = false;
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

  const completion = (profile ?? profileQuery.data)?.profileCompletion ?? 0;
  const profileSnapshot = profile ?? profileQuery.data;

  if (error && !profileSnapshot) {
    return (
      <MemberPageLayout maxWidth="max-w-3xl">
        <p className="text-sm text-red-400">{error}</p>
      </MemberPageLayout>
    );
  }

  return (
    <MemberPageLayout maxWidth="max-w-5xl">
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
        subtitle={profileSnapshot ? profileCompletionHint(completion) : undefined}
        emblemSize="h-40 w-40 sm:h-56 sm:w-56"
        meta={
          profileSnapshot && (
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
          profileSnapshot && (
            <Button
              asChild
              variant="outline"
              className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase"
            >
              <Link to="/br/$slug" params={{ slug: profileSnapshot.slug }}>
                View saved profile
              </Link>
            </Button>
          )
        }
      />

      <form onSubmit={handleSubmit} aria-label="Edit your profile">
        <div className="min-w-0">
          <Tabs
            value={tab}
            onValueChange={(v) =>
              navigate({
                to: "/dashboard/profile",
                search: { tab: v as ProfileTab, ...(focusGame ? { focusGame } : {}) },
                resetScroll: false,
              })
            }
            orientation="vertical"
            className="gap-6 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start"
          >
            <div className="lg:hidden">
              <Label htmlFor="profile-section" className="mb-2 block text-sm text-muted-foreground">
                Profile section
              </Label>
              <MemberSelect
                id="profile-section"
                label="Profile section"
                value={tab}
                options={[
                  { value: "identity", label: "Identity" },
                  { value: "socials", label: "Social links" },
                  { value: "privacy", label: "Privacy" },
                ]}
                onValueChange={(value) =>
                  void navigate({
                    to: "/dashboard/profile",
                    search: { tab: value as ProfileTab },
                    resetScroll: false,
                  })
                }
              />
            </div>
            <TabsList
              aria-label="Profile sections"
              className="hidden h-auto w-full flex-col items-stretch justify-start gap-1 rounded-none border border-white/10 bg-[oklch(0.07_0_0)] p-1 lg:sticky lg:top-24 lg:flex [&>button]:min-h-20 [&>button]:justify-start [&>button]:whitespace-normal [&>button]:text-left [&>button]:border-l-2 [&>button]:border-transparent [&>button[data-state=active]]:border-white"
            >
              <TabsTrigger
                value="identity"
                className="min-h-11 shrink-0 flex-none rounded-none px-4 font-tech text-ui-readable uppercase data-[state=active]:bg-white/10 data-[state=active]:text-foreground sm:flex-1"
              >
                <User className="mr-1.5 h-3.5 w-3.5" />
                <span>
                  Identity
                  <span className="mt-1 block font-sans text-xs normal-case text-muted-foreground">
                    Name, headline and bio
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="socials"
                className="min-h-11 shrink-0 flex-none rounded-none px-4 font-tech text-ui-readable uppercase data-[state=active]:bg-white/10 data-[state=active]:text-foreground sm:flex-1"
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                <span>
                  Social links
                  <span className="mt-1 block font-sans text-xs normal-case text-muted-foreground">
                    Where members can find you
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="min-h-11 shrink-0 flex-none rounded-none px-4 font-tech text-ui-readable uppercase data-[state=active]:bg-white/10 data-[state=active]:text-foreground sm:flex-1"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                <span>
                  Privacy
                  <span className="mt-1 block font-sans text-xs normal-case text-muted-foreground">
                    Who can see your profile
                  </span>
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="min-w-0">
              <TabsContent value="identity" className="mt-0">
                <fieldset disabled={saving || !formInitialized} className="min-w-0">
                  <h2 className="mb-2 font-display text-2xl">Identity</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Introduce yourself to the Black Rose community.
                  </p>
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

                  <div className="mt-5 space-y-2">
                    <Label htmlFor="profile-region">Region</Label>
                    <MemberSelect
                      id="profile-region"
                      label="Region"
                      value={normalizedRegion || "__none__"}
                      options={[
                        { value: "__none__", label: "Select a region" },
                        ...regionOptions.map((option) => ({ value: option, label: option })),
                      ]}
                      disabled={saving || !formInitialized}
                      onValueChange={(value) => {
                        markDirty();
                        setRegion(value === "__none__" ? "" : value);
                      }}
                    />
                  </div>

                  <div className="mt-5 grid gap-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="profile-display-name"
                        className="font-tech text-label-readable uppercase text-muted-foreground"
                      >
                        Display Name
                      </Label>
                      <Input
                        id="profile-display-name"
                        value={displayName}
                        onChange={(e) => {
                          markDirty();
                          setDisplayName(e.target.value);
                        }}
                        required
                        className={techFieldClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="profile-headline"
                        className="font-tech text-label-readable uppercase text-muted-foreground"
                      >
                        Headline
                      </Label>
                      <Input
                        id="profile-headline"
                        value={headline}
                        onChange={(e) => {
                          markDirty();
                          setHeadline(e.target.value);
                        }}
                        placeholder="Valorant Duelist · Black Rose Member"
                        className={techFieldClass}
                      />
                      <p className="text-sm text-muted-foreground/60">
                        Shown under your name on your public profile.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="profile-bio"
                        className="font-tech text-label-readable uppercase text-muted-foreground"
                      >
                        Bio
                      </Label>
                      <Textarea
                        id="profile-bio"
                        value={bio}
                        onChange={(e) => {
                          markDirty();
                          setBio(e.target.value);
                        }}
                        rows={5}
                        placeholder="Tell the community about yourself…"
                        className={cn(
                          techFieldClass,
                          "custom-scrollbar max-h-48 resize-y overflow-y-auto",
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        Share the games you play and what you enjoy outside the arena.
                      </p>
                    </div>
                  </div>
                </fieldset>
              </TabsContent>

              <TabsContent value="socials" className="mt-0">
                <fieldset disabled={saving || !formInitialized} className="min-w-0">
                  <h2 className="mb-2 font-display text-2xl">Social links</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Add a full https:// link. Choose visibility separately for each platform.
                  </p>
                  <TechPanel label="Links" title="Social Profiles" noPadding>
                    <ul className="divide-y divide-white/6">
                      {SOCIAL_PLATFORM_ORDER.map((platform) => (
                        <li
                          key={platform}
                          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                        >
                          <Label
                            htmlFor={`profile-social-${platform}`}
                            className="w-28 shrink-0 font-tech text-label-readable uppercase text-muted-foreground"
                          >
                            {SOCIAL_PLATFORM_LABELS[platform]}
                          </Label>
                          <Input
                            id={`profile-social-${platform}`}
                            type="url"
                            value={socials[platform].url}
                            onChange={(e) => {
                              markDirty();
                              setSocials((s) => ({
                                ...s,
                                [platform]: { ...s[platform], url: e.target.value },
                              }));
                            }}
                            placeholder="https://"
                            className={cn(techFieldClass, "flex-1")}
                          />
                          <div className="flex shrink-0 items-center gap-2">
                            <Switch
                              aria-label={`Show ${SOCIAL_PLATFORM_LABELS[platform]} link publicly`}
                              checked={socials[platform].isPublic}
                              disabled={!socials[platform].url.trim()}
                              onCheckedChange={(checked) => {
                                markDirty();
                                setSocials((s) => ({
                                  ...s,
                                  [platform]: { ...s[platform], isPublic: checked },
                                }));
                              }}
                            />
                            <span className="font-tech text-label-readable uppercase text-muted-foreground">
                              Public
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </TechPanel>
                </fieldset>
              </TabsContent>

              <TabsContent value="privacy" className="mt-0">
                <fieldset disabled={saving || !formInitialized} className="min-w-0">
                  <h2 className="mb-2 font-display text-2xl">Privacy</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Control access to your profile. Social links have their own visibility switches.
                  </p>
                  <TechPanel label="Visibility" title="Profile Access">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Label htmlFor="profile-public" className="text-sm font-medium">
                          Public profile
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          When off, your member profile is hidden from other visitors.
                        </p>
                      </div>
                      <Switch
                        id="profile-public"
                        checked={isPublic}
                        onCheckedChange={(checked) => {
                          markDirty();
                          setIsPublic(checked);
                        }}
                      />
                    </div>
                  </TechPanel>
                </fieldset>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <ProfileEditorActions
          dirty={dirty}
          saving={saving}
          saved={saved}
          initialized={formInitialized}
          error={error}
          onDiscard={discardChanges}
        />
      </form>

      {profileSnapshot && (
        <ProfileCompleteCelebrationDialog
          open={celebrationOpen}
          displayName={profileSnapshot.displayName}
          avatarUrl={profileSnapshot.avatarUrl}
          avatarInitials={profileSnapshot.avatarInitials}
          profileSlug={profileSnapshot.slug}
          onDismiss={dismissCelebration}
        />
      )}
    </MemberPageLayout>
  );
}
