import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSyncedMemberSession } from "@/features/auth/hooks/useSyncedMemberSession";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import { MemberHeroBanner } from "@/features/member/components/MemberShell";
import { MemberSelect } from "@/features/member/components/MemberSelect";
import { DashboardHubSkeleton } from "@/features/member/components/DashboardHubSkeleton";
import { MEMBER_READ_QUERY_OPTIONS } from "@/features/member/queries/member-query-options";
import { shouldGuardMyGamesExit } from "@/features/shared/utils/hub-search";
import { queryKeys } from "@/lib/query-keys";
import { matchesCatalogGame } from "../rules";
import type { MemberGameWorkspace } from "../types";
import {
  changeMyGameMembership,
  changeMyMainGame,
  fetchMyGameWorkspace,
  saveMyGameProfile,
} from "../services/game-membership.service";
import { createGameProfileWorkspace, mergeSavedGameProfile } from "./game-profile-editor";
import { createMainGamePreference } from "./main-game-preference";
import { GameProfilesPanel } from "./GameProfilesPanel";

const NONE = "__none__";

export function MyGamesDashboard({
  navigation,
  focusGame,
  onSelectGame,
}: {
  navigation: ReactNode;
  focusGame?: string;
  onSelectGame: (gameId: string) => void;
}) {
  const { session, isSyncing } = useSyncedMemberSession();
  const memberId = session?.id;
  const queryClient = useQueryClient();
  const workspaceKey = useMemo(() => ["my-game-workspace", memberId], [memberId]);
  const canEdit = Boolean(session && hasFullMemberAccess(session.role));
  const gameQuery = useQuery({
    queryKey: workspaceKey,
    queryFn: fetchMyGameWorkspace,
    enabled: canEdit,
    ...MEMBER_READ_QUERY_OPTIONS,
  });
  const workspace = useMemo(
    () =>
      createGameProfileWorkspace({
        async saveProfile(input) {
          const result = await saveMyGameProfile(input);
          // Do not let an older background read restore stale shared Riot identities.
          await queryClient.cancelQueries({ queryKey: workspaceKey });
          queryClient.setQueryData<MemberGameWorkspace>(workspaceKey, (data) =>
            data ? mergeSavedGameProfile(data, result) : data,
          );
          if (memberId)
            void queryClient
              .invalidateQueries({ queryKey: queryKeys.memberProfile(memberId) })
              .catch(() => undefined);
          return result;
        },
        async changeMembership(input) {
          const result = await changeMyGameMembership(input);
          await queryClient.cancelQueries({ queryKey: workspaceKey });
          queryClient.setQueryData<MemberGameWorkspace>(workspaceKey, (data) =>
            data
              ? {
                  ...data,
                  memberships: [
                    ...data.memberships.filter((item) => item.gameId !== result.gameId),
                    result,
                  ],
                }
              : data,
          );
          if (memberId)
            void queryClient
              .invalidateQueries({ queryKey: queryKeys.memberProfile(memberId) })
              .catch(() => undefined);
          return result;
        },
      }),
    [memberId, queryClient, workspaceKey],
  );
  const preference = useMemo(
    () =>
      createMainGamePreference(null, async (gameId) => {
        await changeMyMainGame({ gameId });
        await queryClient.cancelQueries({ queryKey: workspaceKey });
        queryClient.setQueryData<MemberGameWorkspace>(workspaceKey, (data) =>
          data
            ? {
                ...data,
                legacy: {
                  ...data.legacy,
                  mainGame: data.games.find((game) => game.id === gameId)?.display_name ?? "",
                },
              }
            : data,
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: workspaceKey }),
          ...(memberId
            ? [queryClient.invalidateQueries({ queryKey: queryKeys.memberProfile(memberId) })]
            : []),
        ]);
      }),
    [memberId, queryClient, workspaceKey],
  );
  const gameState = useSyncExternalStore(
    workspace.subscribe,
    workspace.getSnapshot,
    workspace.getSnapshot,
  );
  const preferenceState = useSyncExternalStore(
    preference.subscribe,
    preference.getSnapshot,
    preference.getSnapshot,
  );
  const savedName = gameQuery.data?.legacy.mainGame ?? "";
  const savedGame = gameQuery.data?.games.find((game) => matchesCatalogGame(savedName, game));
  const savedValue = savedGame?.id ?? (savedName ? `legacy:${savedName}` : null);
  useEffect(() => {
    if (gameQuery.data) workspace.load(gameQuery.data);
  }, [gameQuery.data, workspace]);
  useEffect(() => {
    if (gameQuery.data) preference.reconcile(savedValue);
  }, [gameQuery.data, preference, savedValue]);
  useBlocker({
    shouldBlockFn: ({ next }) =>
      shouldGuardMyGamesExit(
        workspace.getSnapshot().dirty ||
          workspace.getSnapshot().busy ||
          preference.getSnapshot().dirty ||
          preference.getSnapshot().busy,
        next.pathname,
        next.search,
      ) &&
      !window.confirm(
        "Leave My Games? Unsaved changes will be discarded; pending saves may still finish.",
      ),
    enableBeforeUnload: () =>
      workspace.getSnapshot().dirty ||
      workspace.getSnapshot().busy ||
      preference.getSnapshot().dirty ||
      preference.getSnapshot().busy,
  });

  if (isSyncing || !canEdit) return <DashboardHubSkeleton navigation={navigation} />;
  const activeGames = gameQuery.data?.games.filter((game) => game.is_active) ?? [];
  const unavailablePreference =
    preferenceState.value !== null &&
    !activeGames.some((game) => game.id === preferenceState.value);
  const options = [
    { value: NONE, label: "No Main Game preference" },
    ...(unavailablePreference
      ? [
          {
            value: preferenceState.value!,
            label: `Unavailable Main Game preference${preferenceState.value === savedValue ? " (saved)" : ""}`,
            disabled: true,
          },
        ]
      : []),
    ...activeGames.map((game) => ({ value: game.id, label: game.display_name })),
  ];
  // Filter against the latest query as well, before the workspace load effect runs.
  const entries = gameState.entries.filter(({ game }) =>
    activeGames.some((active) => active.id === game.id),
  );
  const selected = entries.find(({ game }) => game.id === preferenceState.value);
  const savedRole = selected?.editor.getSnapshot().profile?.roleLabel;
  return (
    <>
      <MemberHeroBanner
        eyebrow="Dashboard · Member Console"
        title="My Games"
        subtitle="Your games, characters and membership applications in one place."
      />
      {navigation}
      <section
        aria-label="Main Game preference"
        className="min-w-0 border border-white/10 bg-[oklch(0.07_0_0)] p-4"
      >
        <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="my-main-game">Main Game</Label>
            <MemberSelect
              id="my-main-game"
              label="Main Game"
              value={preferenceState.value ?? NONE}
              options={options}
              disabled={!gameQuery.data || preferenceState.busy}
              onValueChange={(value) => {
                if (value === NONE) preference.edit(null);
                else if (activeGames.some((game) => game.id === value)) preference.edit(value);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 [&_button]:flex-1 sm:[&_button]:flex-none">
            <Button
              type="button"
              disabled={!preferenceState.dirty || preferenceState.busy || unavailablePreference}
              onClick={() => void preference.save()}
              className="min-h-11 rounded-none"
            >
              Save Main Game
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!preferenceState.dirty || preferenceState.busy}
              onClick={() => preference.discard()}
              className="min-h-11 rounded-none"
            >
              Discard preference
            </Button>
          </div>
        </div>
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="w-fit cursor-pointer py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            About Main Game
          </summary>
          <p className="mt-2 max-w-prose leading-relaxed">
            Choose the game shown first on your profile. This preference does not join a game, apply
            for membership or save game profile changes.
          </p>
        </details>
        {savedRole && (
          <p className="mt-3 text-xs text-muted-foreground">
            Saved role: {savedRole}. Change this in the matching game profile below.
          </p>
        )}
        <p
          role="status"
          aria-live="polite"
          className="text-xs text-muted-foreground empty:hidden [&:not(:empty)]:mt-3"
        >
          {preferenceState.busy
            ? "Saving Main Game…"
            : (preferenceState.message ??
              (preferenceState.dirty ? "Unsaved Main Game preference" : ""))}
        </p>
        {preferenceState.error && (
          <p role="alert" className="mt-2 text-sm text-red-400">
            {preferenceState.error}
          </p>
        )}
      </section>
      <GameProfilesPanel
        entries={entries}
        loading={gameQuery.isPending}
        error={
          gameQuery.error
            ? gameQuery.error instanceof Error
              ? gameQuery.error.message
              : "Could not load your games."
            : null
        }
        onRetry={() => void gameQuery.refetch()}
        focusGame={focusGame}
        onSelectGame={onSelectGame}
      />
    </>
  );
}
