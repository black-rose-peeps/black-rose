import { memberTransition } from "../rules";
import type {
  GameIdentityLegacy,
  GameMembership,
  MemberGameProfile,
  MemberGameWorkspace,
  MemberMembershipAction,
  MembershipGame,
  SaveGameProfileInput,
} from "../types";

import { isRiotGame } from "../../member/utils/game-identity";
import {
  formatValorantRiotId,
  validateValorantIdentityInput,
} from "../../member/utils/valorant-identity";

export const PROFILE_FIELD_PROPERTIES = {
  class: "className",
  server: "serverName",
  faction: "faction",
} as const;
export function activeProfileRoles(game: MembershipGame) {
  return game.roles.filter(
    (role) => (role as typeof role & { is_active?: boolean }).is_active !== false,
  );
}

function usesSharedRiotIdentity(game: MembershipGame) {
  return game.identity_group === "riot" || isRiotGame(game.display_name) || isRiotGame(game.name);
}

/** Mirror the atomic shared-identity projection without inventing profiles or memberships. */
export function mergeSavedGameProfile(
  data: MemberGameWorkspace,
  saved: MemberGameProfile,
): MemberGameWorkspace {
  const source = data.games.find((game) => game.id === saved.gameId);
  const shared = source && usesSharedRiotIdentity(source);
  const relatedIds = new Set(data.games.filter(usesSharedRiotIdentity).map((game) => game.id));
  const [name = "", tagline = ""] = saved.ign.split("#");
  return {
    ...data,
    profiles: [
      ...data.profiles
        .filter((profile) => profile.gameId !== saved.gameId)
        .map((profile) =>
          shared && relatedIds.has(profile.gameId) ? { ...profile, ign: saved.ign } : profile,
        ),
      saved,
    ],
    legacy: shared
      ? { ...data.legacy, valorantGameName: name, valorantTagline: tagline }
      : data.legacy,
  };
}

export interface GameProfileEditorApi {
  saveProfile(input: SaveGameProfileInput): Promise<MemberGameProfile>;
  changeMembership(input: {
    gameId: string;
    action: MemberMembershipAction;
  }): Promise<GameMembership>;
}
export interface GameProfileEditorState {
  draft: SaveGameProfileInput;
  profile: MemberGameProfile | null;
  membership: GameMembership | null;
  dirty: boolean;
  hasUserChanges: boolean;
  busy: boolean;
  error: string | null;
  message: string | null;
  actions: MemberMembershipAction[];
  prefillSource: string | null;
}
function inputFromProfile(profile: MemberGameProfile): SaveGameProfileInput {
  return {
    gameId: profile.gameId,
    ign: profile.ign,
    roleId: profile.roleId,
    className: profile.className,
    serverName: profile.serverName,
    faction: profile.faction,
  };
}
export function createGameProfileEditor(
  game: MembershipGame,
  profile: MemberGameProfile | null,
  membership: GameMembership | null,
  legacy: GameIdentityLegacy,
  api: GameProfileEditorApi,
) {
  const empty: SaveGameProfileInput = {
    gameId: game.id,
    ign: "",
    roleId: null,
    className: "",
    serverName: "",
    faction: "",
  };
  let baseline = profile ? inputFromProfile(profile) : empty;
  const riot = usesSharedRiotIdentity(game);
  const sharedRiotId = riot
    ? formatValorantRiotId(legacy.valorantGameName, legacy.valorantTagline)
    : null;
  const legacyIgn =
    legacy.gameIdentities[game.display_name] ?? legacy.gameIdentities[game.name] ?? "";
  const draft = profile ? { ...baseline } : { ...empty, ign: sharedRiotId ?? legacyIgn };
  let editBaseline = { ...draft };
  let suggestedIgn = draft.ign;
  function availableActions(): MemberMembershipAction[] {
    const preferred: MemberMembershipAction[] =
      membership?.status === "applying"
        ? ["withdraw"]
        : membership?.status === "accepted" || membership?.status === "inactive"
          ? ["leave"]
          : membership?.status === "interested"
            ? ["apply", "leave"]
            : ["interest", "apply"];
    return preferred.filter((action) => {
      try {
        memberTransition(membership?.status ?? null, action, true, game.is_active);
        return true;
      } catch {
        return false;
      }
    });
  }
  let state: GameProfileEditorState = {
    draft,
    profile,
    membership,
    dirty: game.is_active && JSON.stringify(draft) !== JSON.stringify(baseline),
    hasUserChanges: false,
    busy: false,
    error: null,
    message: null,
    actions: availableActions(),
    prefillSource:
      profile || !draft.ign
        ? null
        : sharedRiotId
          ? "Shared Riot account prefill — review and save for this game. This does not join the game."
          : "Previous in-game identity prefill — review and save for this game.",
  };
  const listeners = new Set<() => void>();
  let membershipPending = false;
  function update(patch: Partial<GameProfileEditorState>) {
    state = { ...state, ...patch };
    const differsFromSaved = JSON.stringify(state.draft) !== JSON.stringify(baseline);
    state.dirty = game.is_active && differsFromSaved;
    state.hasUserChanges =
      differsFromSaved && JSON.stringify(state.draft) !== JSON.stringify(editBaseline);
    membership = state.membership;
    state.actions = availableActions();
    listeners.forEach((listener) => listener());
  }
  return {
    reconcileSharedRiotIdentity(ign: string) {
      const explicitlyEdited = state.draft.ign !== (state.profile ? baseline.ign : suggestedIgn);
      if (state.profile) baseline = { ...baseline, ign };
      suggestedIgn = ign;
      editBaseline = { ...editBaseline, ign };
      update({
        profile: state.profile ? { ...state.profile, ign } : null,
        draft: { ...state.draft, ign: explicitlyEdited ? state.draft.ign : ign },
        message: explicitlyEdited
          ? "Shared Riot ID updated. Your unsaved Riot ID is kept; saving it changes your other Riot profiles."
          : state.message,
      });
    },
    reconcile(
      nextGame: MembershipGame,
      nextProfile: MemberGameProfile | null,
      nextMembership: GameMembership | null,
    ) {
      game = nextGame;
      // Catalog availability is authoritative even while a draft or write is retained.
      if (state.hasUserChanges || state.busy) {
        // Profile drafts/saves do not own membership; a pending membership action does.
        update(membershipPending ? {} : { membership: nextMembership });
        return false;
      }
      baseline = nextProfile ? inputFromProfile(nextProfile) : empty;
      const nextDraft = nextProfile ? { ...baseline } : { ...baseline, ign: suggestedIgn };
      editBaseline = { ...nextDraft };
      update({
        profile: nextProfile,
        membership: nextMembership,
        draft: nextDraft,
        prefillSource: nextProfile ? null : state.prefillSource,
      });
      return true;
    },
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    edit(patch: Partial<Omit<SaveGameProfileInput, "gameId">>) {
      if (game.is_active && !state.busy)
        update({ draft: { ...state.draft, ...patch }, error: null, message: null });
    },
    discard() {
      if (!state.busy) {
        editBaseline = { ...baseline };
        suggestedIgn = baseline.ign;
        update({ draft: { ...baseline }, prefillSource: null, error: null, message: null });
      }
    },
    async save() {
      if (!game.is_active || state.busy || !state.dirty) return;
      if (
        state.draft.roleId &&
        state.draft.roleId !== baseline.roleId &&
        !activeProfileRoles(game).some((role) => role.id === state.draft.roleId)
      ) {
        update({ error: "Choose an active role for this game." });
        return;
      }
      for (const key of Object.keys(
        PROFILE_FIELD_PROPERTIES,
      ) as (keyof typeof PROFILE_FIELD_PROPERTIES)[]) {
        const field = game.profile_field_config?.[key];
        const property = PROFILE_FIELD_PROPERTIES[key];
        const value = state.draft[property];
        if (
          field?.enabled &&
          field.kind === "select" &&
          value &&
          value !== baseline[property] &&
          !field.options.includes(value)
        ) {
          update({ error: `Choose an available ${field.label} option.` });
          return;
        }
      }
      if (riot && state.draft.ign.trim()) {
        const parts = state.draft.ign.trim().split("#");
        const error =
          parts.length !== 2
            ? "Enter your Riot ID as name#tagline."
            : validateValorantIdentityInput(parts[0], parts[1]);
        if (error) {
          update({ error });
          return;
        }
      }
      update({ busy: true, error: null, message: null });
      try {
        const saved = await api.saveProfile({ ...state.draft });
        baseline = inputFromProfile(saved);
        editBaseline = { ...baseline };
        update({
          profile: saved,
          draft: { ...baseline },
          message: "Game profile saved. Membership unchanged.",
        });
      } catch (error) {
        update({
          error: error instanceof Error ? error.message : "Could not save game profile. Try again.",
        });
      } finally {
        update({ busy: false });
      }
    },
    async act(action: MemberMembershipAction) {
      if (state.busy) return;
      if (state.dirty) {
        update({
          error: "Save your game profile first, or discard its changes before changing membership.",
        });
        return;
      }
      if (action === "apply" && !state.profile?.ign.trim()) {
        update({ error: "Save a nonblank IGN before applying." });
        return;
      }
      if (!state.actions.includes(action)) return;
      membershipPending = true;
      update({ busy: true, error: null, message: null });
      try {
        update({
          membership: await api.changeMembership({ gameId: game.id, action }),
          message: "Membership updated.",
        });
      } catch (error) {
        update({
          error: error instanceof Error ? error.message : "Could not update membership. Try again.",
        });
      } finally {
        membershipPending = false;
        update({ busy: false });
      }
    },
  };
}

export interface GameProfileEntry {
  game: MembershipGame;
  editor: ReturnType<typeof createGameProfileEditor>;
}

/** Lives at the page level so switching sections or saving common fields cannot discard game drafts. */
export function createGameProfileWorkspace(api: GameProfileEditorApi) {
  let retainedEntries: GameProfileEntry[] = [];
  let state: { entries: GameProfileEntry[]; dirty: boolean; busy: boolean } = {
    entries: [],
    dirty: false,
    busy: false,
  };
  const listeners = new Set<() => void>();
  function publish() {
    const entries = retainedEntries.filter(({ game }) => game.is_active);
    state = {
      entries,
      dirty: entries.some(({ editor }) => editor.getSnapshot().hasUserChanges),
      busy: retainedEntries.some(({ editor }) => editor.getSnapshot().busy),
    };
    listeners.forEach((listener) => listener());
  }
  const editorApi: GameProfileEditorApi = {
    ...api,
    async saveProfile(input) {
      const target = retainedEntries.find(({ game }) => game.id === input.gameId);
      if (
        target &&
        usesSharedRiotIdentity(target.game) &&
        retainedEntries.some(
          ({ game, editor }) =>
            game.id !== input.gameId && usesSharedRiotIdentity(game) && editor.getSnapshot().busy,
        )
      )
        throw new Error(
          "Another Riot profile is updating. Wait for it to finish, then save again.",
        );
      const saved = await api.saveProfile(input);
      const source = retainedEntries.find(({ game }) => game.id === saved.gameId);
      if (source && usesSharedRiotIdentity(source.game)) {
        for (const entry of retainedEntries) {
          if (entry.game.id !== saved.gameId && usesSharedRiotIdentity(entry.game))
            entry.editor.reconcileSharedRiotIdentity(saved.ign);
        }
      }
      return saved;
    },
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load(data: MemberGameWorkspace) {
      const existing = new Map(retainedEntries.map((entry) => [entry.game.id, entry]));
      const entries = data.games.map((game) => {
        const profile = data.profiles.find((item) => item.gameId === game.id) ?? null;
        const membership = data.memberships.find((item) => item.gameId === game.id) ?? null;
        const entry = existing.get(game.id);
        existing.delete(game.id);
        if (entry) {
          entry.editor.reconcile(game, profile, membership);
          return { ...entry, game };
        }
        const editor = createGameProfileEditor(game, profile, membership, data.legacy, editorApi);
        editor.subscribe(() => publish());
        return { game, editor };
      });
      // Keep drafts and pending writes in memory, never as a visible catalog fallback.
      for (const entry of existing.values()) {
        const game = { ...entry.game, is_active: false };
        const snapshot = entry.editor.getSnapshot();
        entry.editor.reconcile(game, snapshot.profile, snapshot.membership);
        entries.push({ ...entry, game });
      }
      retainedEntries = entries;
      publish();
    },
  };
}
