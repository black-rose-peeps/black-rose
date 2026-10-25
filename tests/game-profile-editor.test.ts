import assert from "node:assert/strict";
import test from "node:test";
import * as editorModule from "../src/features/game-membership/components/game-profile-editor";
import {
  createGameProfileEditor,
  createGameProfileWorkspace,
} from "../src/features/game-membership/components/game-profile-editor";
import type {
  GameMembership,
  MemberMembershipAction,
  SaveGameProfileInput,
  MembershipGame,
} from "../src/features/game-membership/types";

test("retired catalog games preserve profiles but still permit withdrawing and leaving", async () => {
  for (const [status, action] of [
    ["applying", "withdraw"],
    ["accepted", "leave"],
    ["inactive", "leave"],
  ] as const) {
    let writes = 0;
    const editor = createGameProfileEditor(
      { ...game, is_active: false },
      null,
      { gameId: game.id, memberId: "me", status, updatedAt: "" },
      legacy,
      {
        ...api,
        async changeMembership(input) {
          writes++;
          return api.changeMembership(input);
        },
      },
    );
    assert.ok(editor.getSnapshot().actions.includes(action));
    await editor.act(action);
    assert.equal(writes, 1);
    assert.equal(editor.getSnapshot().profile, null);
  }
});

test("workspace refresh retains dirty editors and keeps navigation guarded through pending saves and errors", async () => {
  let rejectSave!: (error: Error) => void;
  let writes = 0;
  const workspace = createGameProfileWorkspace({
    ...api,
    async saveProfile(input) {
      writes++;
      if (writes === 1)
        return new Promise((_resolve, reject) => {
          rejectSave = reject;
        });
      return api.saveProfile(input);
    },
  });
  const data = {
    games: [game],
    profiles: [],
    memberships: [],
    legacy: { ...legacy, gameIdentities: {} },
  };
  workspace.load(data);
  const editor = workspace.getSnapshot().entries[0].editor;
  editor.edit({ ign: "Draft character" });
  assert.equal(workspace.getSnapshot().dirty, true);
  workspace.load({ ...data, legacy });
  assert.equal(workspace.getSnapshot().entries[0].editor, editor);
  assert.equal(editor.getSnapshot().draft.ign, "Draft character");
  const pending = editor.save();
  await editor.save();
  await editor.act("apply");
  editor.edit({ ign: "Should not replace pending snapshot" });
  assert.equal(writes, 1);
  assert.equal(workspace.getSnapshot().busy, true);
  assert.equal(workspace.getSnapshot().dirty, true);
  rejectSave(new Error("Offline — retry"));
  await pending;
  assert.match(editor.getSnapshot().error ?? "", /Offline/);
  assert.equal(editor.getSnapshot().draft.ign, "Draft character");
  await editor.save();
  assert.equal(writes, 2);
  assert.equal(workspace.getSnapshot().dirty, false);
  assert.equal(workspace.getSnapshot().busy, false);
  assert.equal(editor.getSnapshot().membership, null);
});

export const game = {
  id: "g1",
  name: "Palworld",
  slug: "palworld",
  display_name: "Palworld",
  is_active: true,
  roles: [{ id: "r1", role_name: "Builder" }],
} as MembershipGame;
export const legacy = {
  mainGame: "Valorant",
  mainRole: "Duelist",
  valorantGameName: "Rose",
  valorantTagline: "ABC",
  gameIdentities: { Palworld: "Old character" },
  ingameDisplayName: "Other",
};
const api = {
  async saveProfile(input: SaveGameProfileInput) {
    return { ...input, memberId: "me", roleLabel: "", updatedAt: "now" };
  },
  async changeMembership(input: {
    gameId: string;
    action: MemberMembershipAction;
  }): Promise<GameMembership> {
    return { gameId: input.gameId, memberId: "me", status: "applying", updatedAt: "now" };
  },
};

test("external acceptance refresh updates membership without replacing a dirty IGN draft", async () => {
  const profile = await api.saveProfile({
    gameId: game.id,
    ign: "Saved character",
    roleId: null,
    className: "",
    serverName: "",
    faction: "",
  });
  const applying: GameMembership = {
    gameId: game.id,
    memberId: "me",
    status: "applying",
    updatedAt: "before",
  };
  const accepted: GameMembership = { ...applying, status: "accepted", updatedAt: "after" };
  let actions = 0;
  const workspace = createGameProfileWorkspace({
    ...api,
    async changeMembership(input) {
      actions++;
      return api.changeMembership(input);
    },
  });
  const data = { games: [game], profiles: [profile], memberships: [applying], legacy };
  workspace.load(data);
  const editor = workspace.getSnapshot().entries[0].editor;
  editor.edit({ ign: "Keep my draft" });
  const draft = editor.getSnapshot().draft;
  workspace.load({
    ...data,
    profiles: [{ ...profile, ign: "External profile" }],
    memberships: [accepted],
  });
  assert.equal(workspace.getSnapshot().entries[0].editor, editor);
  assert.equal(editor.getSnapshot().draft, draft);
  assert.equal(editor.getSnapshot().profile, profile);
  assert.equal(editor.getSnapshot().hasUserChanges, true);
  assert.equal(workspace.getSnapshot().dirty, true);
  assert.deepEqual(editor.getSnapshot().membership, accepted);
  assert.deepEqual(editor.getSnapshot().actions, ["leave"]);
  await editor.act("leave");
  assert.equal(actions, 0, "the dirty-profile membership guard still applies");
  editor.discard();
  assert.equal(editor.getSnapshot().draft.ign, "Saved character");
  assert.equal(workspace.getSnapshot().dirty, false);
  assert.deepEqual(editor.getSnapshot().membership, accepted);
  assert.deepEqual(editor.getSnapshot().actions, ["leave"]);
});

for (const outcome of ["success", "failure"] as const) {
  test(`external acceptance refresh survives a pending profile save ${outcome}`, async () => {
    const profile = await api.saveProfile({
      gameId: game.id,
      ign: "Saved character",
      roleId: null,
      className: "",
      serverName: "",
      faction: "",
    });
    const applying: GameMembership = {
      gameId: game.id,
      memberId: "me",
      status: "applying",
      updatedAt: "before",
    };
    const accepted: GameMembership = { ...applying, status: "accepted", updatedAt: "after" };
    let resolveSave!: (saved: typeof profile) => void;
    let rejectSave!: (error: Error) => void;
    let saves = 0;
    let actions = 0;
    const workspace = createGameProfileWorkspace({
      async saveProfile() {
        saves++;
        return new Promise<typeof profile>((resolve, reject) => {
          resolveSave = resolve;
          rejectSave = reject;
        });
      },
      async changeMembership(input) {
        actions++;
        return api.changeMembership(input);
      },
    });
    const data = { games: [game], profiles: [profile], memberships: [applying], legacy };
    workspace.load(data);
    const editor = workspace.getSnapshot().entries[0].editor;
    editor.edit({ ign: "Pending character" });
    const draft = editor.getSnapshot().draft;
    const pending = editor.save();
    assert.deepEqual(editor.getSnapshot().membership, applying);
    workspace.load({
      ...data,
      profiles: [{ ...profile, ign: "External profile" }],
      memberships: [accepted],
    });
    assert.deepEqual(editor.getSnapshot().membership, accepted);
    assert.deepEqual(editor.getSnapshot().actions, ["leave"]);
    assert.equal(editor.getSnapshot().draft, draft);
    assert.equal(editor.getSnapshot().profile, profile);
    assert.equal(workspace.getSnapshot().dirty, true);
    assert.equal(workspace.getSnapshot().busy, true);
    editor.discard();
    editor.edit({ ign: "Blocked edit" });
    await editor.save();
    await editor.act("leave");
    assert.equal(editor.getSnapshot().draft, draft);
    assert.equal(saves, 1);
    assert.equal(actions, 0);
    if (outcome === "success") resolveSave({ ...profile, ign: "Pending character" });
    else rejectSave(new Error("Save failed"));
    await pending;
    assert.deepEqual(editor.getSnapshot().membership, accepted);
    assert.deepEqual(editor.getSnapshot().actions, ["leave"]);
    assert.equal(editor.getSnapshot().draft.ign, "Pending character");
    assert.equal(workspace.getSnapshot().busy, false);
    assert.equal(workspace.getSnapshot().dirty, outcome === "failure");
    if (outcome === "failure") {
      assert.match(editor.getSnapshot().error ?? "", /Save failed/);
      editor.discard();
      assert.equal(editor.getSnapshot().draft.ign, "Saved character");
      assert.equal(workspace.getSnapshot().dirty, false);
      assert.deepEqual(editor.getSnapshot().membership, accepted);
      assert.deepEqual(editor.getSnapshot().actions, ["leave"]);
    }
  });
}

for (const outcome of ["success", "failure"] as const) {
  test(`pending membership ${outcome} owns its result across late workspace reads`, async () => {
    const accepted: GameMembership = {
      gameId: game.id,
      memberId: "me",
      status: "accepted",
      updatedAt: "accepted",
    };
    const left: GameMembership = { ...accepted, status: "left", updatedAt: "left" };
    let resolveAction!: (saved: GameMembership) => void;
    let rejectAction!: (error: Error) => void;
    let actions = 0;
    const workspace = createGameProfileWorkspace({
      ...api,
      async changeMembership() {
        actions++;
        return new Promise<GameMembership>((resolve, reject) => {
          resolveAction = resolve;
          rejectAction = reject;
        });
      },
    });
    const data = { games: [game], profiles: [], memberships: [accepted], legacy };
    workspace.load(data);
    const editor = workspace.getSnapshot().entries[0].editor;
    editor.discard();
    const pending = editor.act("leave");
    workspace.load({ ...data, memberships: [] });
    assert.deepEqual(editor.getSnapshot().membership, accepted);
    assert.deepEqual(editor.getSnapshot().actions, ["leave"]);
    assert.equal(workspace.getSnapshot().busy, true);
    await editor.act("leave");
    assert.equal(actions, 1);
    let lateRead = false;
    editor.subscribe(() => {
      if (!lateRead && editor.getSnapshot().membership?.status === "left") {
        lateRead = true;
        workspace.load(data);
      }
    });
    if (outcome === "success") resolveAction(left);
    else rejectAction(new Error("Leave failed"));
    await pending;
    assert.deepEqual(editor.getSnapshot().membership, outcome === "success" ? left : accepted);
    assert.deepEqual(
      editor.getSnapshot().actions,
      outcome === "success" ? ["interest", "apply"] : ["leave"],
    );
    assert.equal(workspace.getSnapshot().busy, false);
    assert.equal(workspace.getSnapshot().dirty, false);
    if (outcome === "success") assert.equal(lateRead, true);
    else assert.match(editor.getSnapshot().error ?? "", /Leave failed/);
  });
}

test("workspace hides deactivated dirty games while retaining drafts and saved participation for reactivation", async () => {
  let writes = 0;
  const workspace = createGameProfileWorkspace({
    ...api,
    async saveProfile(input) {
      writes++;
      return api.saveProfile(input);
    },
  });
  const profile = await api.saveProfile({
    gameId: game.id,
    ign: "Saved character",
    roleId: null,
    className: "",
    serverName: "",
    faction: "",
  });
  const membership: GameMembership = {
    gameId: game.id,
    memberId: "me",
    status: "accepted",
    updatedAt: "",
  };
  const data = { games: [game], profiles: [profile], memberships: [membership], legacy };
  workspace.load(data);
  const editor = workspace.getSnapshot().entries[0].editor;
  editor.edit({ ign: "Keep my draft" });
  workspace.load({ ...data, games: [{ ...game, is_active: false }] });
  assert.deepEqual(workspace.getSnapshot().entries, []);
  assert.equal(
    workspace.getSnapshot().dirty,
    false,
    "hidden drafts do not create an unresolvable exit warning",
  );
  editor.edit({ ign: "Must not edit hidden games" });
  await editor.save();
  assert.equal(writes, 0);
  assert.equal(editor.getSnapshot().draft.ign, "Keep my draft");
  workspace.load(data);
  assert.equal(workspace.getSnapshot().entries[0].editor, editor);
  assert.equal(editor.getSnapshot().draft.ign, "Keep my draft");
  assert.deepEqual(editor.getSnapshot().profile, profile);
  assert.deepEqual(editor.getSnapshot().membership, membership);
  assert.equal(workspace.getSnapshot().dirty, true);
});

test("shared Riot rebases keep a hidden role draft available after reactivation", async () => {
  const games = [
    { ...game, id: "valorant", name: "Valorant", display_name: "Valorant", identity_group: "riot" },
    {
      ...game,
      id: "league",
      name: "League of Legends",
      display_name: "League of Legends",
      identity_group: "riot",
    },
  ];
  const profiles = await Promise.all(
    games.map((item) =>
      api.saveProfile({
        gameId: item.id,
        ign: "OldName#SEA",
        roleId: null,
        className: "",
        serverName: "",
        faction: "",
      }),
    ),
  );
  const workspace = createGameProfileWorkspace(api);
  const data = { games, profiles, memberships: [], legacy };
  workspace.load(data);
  const [valorant, league] = workspace.getSnapshot().entries.map((entry) => entry.editor);
  league.edit({ roleId: "r1" });
  workspace.load({ ...data, games: [games[0], { ...games[1], is_active: false }] });
  valorant.edit({ ign: "NewName#SEA" });
  await valorant.save();
  workspace.load({
    ...data,
    profiles: profiles.map((profile) => ({ ...profile, ign: "NewName#SEA" })),
  });
  assert.equal(league.getSnapshot().draft.roleId, "r1");
  assert.equal(league.getSnapshot().draft.ign, "NewName#SEA");
  assert.equal(league.getSnapshot().dirty, true);
  assert.equal(workspace.getSnapshot().dirty, true);
  await league.save();
  assert.equal(league.getSnapshot().profile?.roleId, "r1");
});

for (const operation of ["save", "membership"] as const) {
  for (const catalog of ["inactive", "missing"] as const) {
    test(`hidden ${catalog} game keeps a pending ${operation} guarded until rejection, with no phantom dirty guard`, async () => {
      let rejectWrite!: (error: Error) => void;
      const gate = new Promise<never>((_resolve, reject) => {
        rejectWrite = reject;
      });
      const workspace = createGameProfileWorkspace({
        async saveProfile() {
          return gate;
        },
        async changeMembership() {
          return gate;
        },
      });
      const data = { games: [game], profiles: [], memberships: [], legacy };
      workspace.load(data);
      const editor = workspace.getSnapshot().entries[0].editor;
      const pending =
        operation === "save" ? editor.save() : (editor.discard(), editor.act("interest"));
      assert.equal(workspace.getSnapshot().busy, true);
      workspace.load({
        ...data,
        games: catalog === "inactive" ? [{ ...game, is_active: false }] : [],
      });
      assert.deepEqual(workspace.getSnapshot().entries, []);
      assert.equal(workspace.getSnapshot().busy, true);
      assert.equal(workspace.getSnapshot().dirty, false);
      rejectWrite(new Error("Game unavailable"));
      await pending;
      assert.equal(workspace.getSnapshot().busy, false);
      assert.equal(workspace.getSnapshot().dirty, false);
      assert.deepEqual(workspace.getSnapshot().entries, []);
      assert.match(editor.getSnapshot().error ?? "", /Game unavailable/);
    });
  }
}

test("inactive initial workspace retains clean saved profiles and memberships for reactivation", async () => {
  const profile = await api.saveProfile({
    gameId: game.id,
    ign: "Saved character",
    roleId: null,
    className: "",
    serverName: "",
    faction: "",
  });
  const membership: GameMembership = {
    gameId: game.id,
    memberId: "me",
    status: "accepted",
    updatedAt: "",
  };
  const data = {
    games: [{ ...game, is_active: false }],
    profiles: [profile],
    memberships: [membership],
    legacy,
  };
  const workspace = createGameProfileWorkspace(api);
  workspace.load(data);
  assert.deepEqual(workspace.getSnapshot(), { entries: [], dirty: false, busy: false });
  workspace.load({ ...data, games: [game] });
  assert.deepEqual(workspace.getSnapshot().entries[0].editor.getSnapshot().profile, profile);
  assert.deepEqual(workspace.getSnapshot().entries[0].editor.getSnapshot().membership, membership);
  assert.equal(workspace.getSnapshot().dirty, false);
});

test("membership uses a saved nonblank IGN and never silently saves or discards drafts", async () => {
  let actions = 0;
  const editor = createGameProfileEditor(game, null, null, legacy, {
    ...api,
    async changeMembership(input) {
      actions++;
      return api.changeMembership(input);
    },
  });
  await editor.act("apply");
  assert.equal(actions, 0);
  assert.match(editor.getSnapshot().error ?? "", /Save.*first/);
  await editor.save();
  assert.equal(editor.getSnapshot().membership, null);
  editor.edit({ ign: "Unsaved" });
  await editor.act("interest");
  assert.equal(actions, 0);
  assert.equal(editor.getSnapshot().draft.ign, "Unsaved");
  editor.discard();
  await editor.act("apply");
  assert.equal(actions, 1);
  assert.equal(editor.getSnapshot().membership?.status, "applying");
  assert.deepEqual(editor.getSnapshot().actions, ["withdraw"]);
  const empty = createGameProfileEditor(game, null, null, { ...legacy, gameIdentities: {} }, api);
  await empty.act("apply");
  assert.match(empty.getSnapshot().error ?? "", /IGN/);
});

test("only explicit member actions are available; retired games stay read-only", async () => {
  for (const [status, expected] of [
    [null, ["interest", "apply"]],
    ["interested", ["apply", "leave"]],
    ["applying", ["withdraw"]],
    ["accepted", ["leave"]],
    ["inactive", ["leave"]],
    ["left", ["interest", "apply"]],
  ] as const) {
    const membership = status ? { memberId: "me", gameId: game.id, status, updatedAt: "" } : null;
    const editor = createGameProfileEditor(
      game,
      null,
      membership,
      { ...legacy, gameIdentities: {} },
      api,
    );
    assert.deepEqual(editor.getSnapshot().actions, expected);
    assert.ok(!editor.getSnapshot().actions.includes("accept" as MemberMembershipAction));
  }
  let writes = 0;
  const retired = createGameProfileEditor({ ...game, is_active: false }, null, null, legacy, {
    async saveProfile(input) {
      writes++;
      return api.saveProfile(input);
    },
    async changeMembership(input) {
      writes++;
      return api.changeMembership(input);
    },
  });
  assert.deepEqual(retired.getSnapshot().actions, []);
  const before = retired.getSnapshot().draft.ign;
  retired.edit({ ign: "Changed" });
  await retired.save();
  await retired.act("apply");
  assert.equal(retired.getSnapshot().draft.ign, before);
  assert.equal(writes, 0);
});

test("Riot prefills are labelled shared-account suggestions and validate the existing name/tag format", async () => {
  const riot = { ...game, name: "Valorant", display_name: "Valorant", identity_group: "riot" };
  let writes = 0;
  const editor = createGameProfileEditor(riot, null, null, legacy, {
    ...api,
    async saveProfile(input) {
      writes++;
      return api.saveProfile(input);
    },
  });
  assert.equal(editor.getSnapshot().draft.ign, "Rose#ABC");
  assert.match(editor.getSnapshot().prefillSource ?? "", /Shared Riot account/);
  assert.equal(editor.getSnapshot().membership, null);
  editor.edit({ ign: "Rose" });
  await editor.save();
  assert.equal(writes, 0);
  assert.match(editor.getSnapshot().error ?? "", /name#tagline/);
  editor.edit({ ign: "ab#ABC" });
  await editor.save();
  assert.equal(writes, 0);
  assert.match(editor.getSnapshot().error ?? "", /3–16/);
  editor.edit({ ign: "Rose#ABC" });
  await editor.save();
  assert.equal(writes, 1);
});

test("configured fields and retired role values survive saves; new selections must be active", async () => {
  const configured: MembershipGame = {
    ...game,
    roles: [
      ...game.roles,
      {
        id: "retired",
        game_id: game.id,
        role_name: "Retired",
        created_at: "",
        is_active: false,
      } as MembershipGame["roles"][number],
    ],
    profile_field_config: {
      class: { enabled: true, label: "Specialty", kind: "select", options: ["Engineer"] },
      server: { enabled: false, label: "Server", kind: "text", options: [] },
    },
  };
  const saved = {
    ...(await api.saveProfile({
      gameId: game.id,
      ign: "Rose",
      roleId: "retired",
      className: "Old class",
      serverName: "Private shard",
      faction: "Legacy faction",
    })),
    roleLabel: "Retired",
  };
  let writes = 0;
  const editor = createGameProfileEditor(configured, saved, null, legacy, {
    ...api,
    async saveProfile(input) {
      writes++;
      return api.saveProfile(input);
    },
  });
  editor.edit({ ign: "New name" });
  await editor.save();
  assert.equal(writes, 1);
  assert.equal(editor.getSnapshot().profile?.roleId, "retired");
  assert.equal(editor.getSnapshot().profile?.className, "Old class");
  assert.equal(editor.getSnapshot().profile?.serverName, "Private shard");
  editor.edit({ roleId: "not-a-role" });
  await editor.save();
  assert.equal(writes, 1);
  assert.match(editor.getSnapshot().error ?? "", /active role/);
  editor.edit({ roleId: "r1", className: "not-a-class" });
  await editor.save();
  assert.equal(writes, 1);
  assert.match(editor.getSnapshot().error ?? "", /Specialty/);
  editor.edit({ className: "Engineer" });
  await editor.save();
  assert.equal(writes, 2);
});

test("untouched identity suggestions never guard reload, but actual edits and pending saves do", async () => {
  const workspace = createGameProfileWorkspace(api);
  const data = { games: [game], profiles: [], memberships: [], legacy };
  workspace.load(data);
  const editor = workspace.getSnapshot().entries[0].editor;
  assert.equal(editor.getSnapshot().dirty, true, "a suggestion can still be explicitly saved");
  assert.equal(workspace.getSnapshot().dirty, false, "a suggestion is not a user edit");
  editor.edit({ ign: "An actual edit" });
  assert.equal(workspace.getSnapshot().dirty, true);
  editor.edit({ ign: "Old character" });
  assert.equal(
    workspace.getSnapshot().dirty,
    false,
    "reverting to the suggestion removes the guard",
  );
  workspace.load(data);
  assert.equal(workspace.getSnapshot().dirty, false, "a refresh must not create edits");
  await editor.save();
  assert.equal(editor.getSnapshot().dirty, false);
  assert.equal(workspace.getSnapshot().dirty, false);
});

test("a legacy IGN prefills without claiming membership or borrowing the main game's role", () => {
  const editor = createGameProfileEditor(game, null, null, legacy, api);
  assert.equal(editor.getSnapshot().draft.ign, "Old character");
  assert.equal(editor.getSnapshot().draft.roleId, null);
  assert.equal(editor.getSnapshot().membership, null);
  assert.equal(editor.getSnapshot().dirty, true);
  assert.deepEqual(editor.getSnapshot().actions, ["interest", "apply"]);
  assert.equal(legacy.mainGame, "Valorant");
});

test("saving a shared Riot identity rebases a sibling's role-only draft before it can revert the identity", async () => {
  const games = [
    { ...game, id: "valorant", name: "Valorant", display_name: "Valorant", identity_group: "riot" },
    {
      ...game,
      id: "league",
      name: "League of Legends",
      display_name: "League of Legends",
      identity_group: "riot",
    },
  ];
  const profiles = await Promise.all(
    games.map((item) =>
      api.saveProfile({
        gameId: item.id,
        ign: "OldName#SEA",
        roleId: null,
        className: "",
        serverName: "",
        faction: "",
      }),
    ),
  );
  const writes: SaveGameProfileInput[] = [];
  const workspace = createGameProfileWorkspace({
    ...api,
    async saveProfile(input) {
      writes.push(input);
      return api.saveProfile(input);
    },
  });
  workspace.load({ games, profiles, memberships: [], legacy });
  const [valorant, league] = workspace.getSnapshot().entries.map((entry) => entry.editor);
  league.edit({ roleId: "r1" });
  valorant.edit({ ign: "NewName#SEA" });
  await valorant.save();
  assert.equal(league.getSnapshot().draft.ign, "NewName#SEA");
  assert.equal(league.getSnapshot().draft.roleId, "r1");
  assert.equal(league.getSnapshot().dirty, true);
  await league.save();
  assert.equal(writes.at(-1)?.ign, "NewName#SEA");
  assert.equal(league.getSnapshot().membership, null);
});

test("the saved-profile cache merge updates existing Riot profiles and prefill without creating game participation", async () => {
  const games = [
    { ...game, id: "valorant", name: "Valorant", display_name: "Valorant", identity_group: "riot" },
    {
      ...game,
      id: "league",
      name: "League of Legends",
      display_name: "League of Legends",
      identity_group: "riot",
    },
    {
      ...game,
      id: "tft",
      name: "Teamfight Tactics",
      display_name: "Teamfight Tactics",
      identity_group: "riot",
    },
    game,
  ];
  const profiles = await Promise.all(
    games
      .filter((item) => item.id !== "tft")
      .map((item) =>
        api.saveProfile({
          gameId: item.id,
          ign: item.id === game.id ? "Unrelated" : "OldName#SEA",
          roleId: null,
          className: "",
          serverName: "",
          faction: "",
        }),
      ),
  );
  const data = { games, profiles, memberships: [], legacy };
  const saved = { ...profiles[0], ign: "NewName#SEA" };
  const merged = editorModule.mergeSavedGameProfile(data, saved);
  assert.equal(merged.profiles.length, 3);
  assert.equal(merged.profiles.find((item) => item.gameId === "league")?.ign, "NewName#SEA");
  assert.equal(merged.profiles.find((item) => item.gameId === game.id)?.ign, "Unrelated");
  assert.equal(merged.legacy.valorantGameName, "NewName");
  assert.equal(merged.legacy.valorantTagline, "SEA");
  assert.equal(profiles[1].ign, "OldName#SEA");
  assert.deepEqual(merged.memberships, []);
  const cleared = editorModule.mergeSavedGameProfile(merged, { ...saved, ign: "" });
  assert.equal(cleared.profiles.find((item) => item.gameId === "league")?.ign, "");
  assert.equal(cleared.legacy.valorantGameName, "");
  assert.equal(cleared.legacy.valorantTagline, "");
});

for (const sibling of ["clean", "explicit draft", "prefill only"] as const) {
  test(`shared Riot updates preserve a sibling's ${sibling} without inventing membership`, async () => {
    const games = [
      {
        ...game,
        id: "valorant",
        name: "Valorant",
        display_name: "Valorant",
        identity_group: "riot",
      },
      {
        ...game,
        id: "league",
        name: "League of Legends",
        display_name: "League of Legends",
        identity_group: "riot",
      },
    ];
    const profiles = await Promise.all(
      games
        .filter((item) => sibling !== "prefill only" || item.id !== "league")
        .map((item) =>
          api.saveProfile({
            gameId: item.id,
            ign: "OldName#SEA",
            roleId: null,
            className: "",
            serverName: "",
            faction: "",
          }),
        ),
    );
    const workspace = createGameProfileWorkspace(api);
    workspace.load({
      games,
      profiles,
      memberships: [],
      legacy: { ...legacy, valorantGameName: "OldName", valorantTagline: "SEA" },
    });
    const [valorant, league] = workspace.getSnapshot().entries.map((entry) => entry.editor);
    if (sibling === "explicit draft") league.edit({ ign: "Intentional#SEA" });
    valorant.edit({ ign: "NewName#SEA" });
    await valorant.save();
    assert.equal(
      league.getSnapshot().draft.ign,
      sibling === "explicit draft" ? "Intentional#SEA" : "NewName#SEA",
    );
    assert.equal(league.getSnapshot().membership, null);
    if (sibling === "prefill only") assert.equal(league.getSnapshot().profile, null);
    if (sibling === "explicit draft") {
      assert.match(league.getSnapshot().message ?? "", /unsaved Riot ID is kept/);
      league.discard();
      assert.equal(league.getSnapshot().draft.ign, "NewName#SEA");
    }
  });
}

test("shared Riot profile saves cannot overlap and submit an old sibling identity", async () => {
  const games = [
    { ...game, id: "valorant", name: "Valorant", display_name: "Valorant", identity_group: "riot" },
    {
      ...game,
      id: "league",
      name: "League of Legends",
      display_name: "League of Legends",
      identity_group: "riot",
    },
  ];
  const profiles = await Promise.all(
    games.map((item) =>
      api.saveProfile({
        gameId: item.id,
        ign: "OldName#SEA",
        roleId: null,
        className: "",
        serverName: "",
        faction: "",
      }),
    ),
  );
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  const workspace = createGameProfileWorkspace({
    ...api,
    async saveProfile(input) {
      writes++;
      if (writes === 1) await gate;
      return api.saveProfile(input);
    },
  });
  workspace.load({ games, profiles, memberships: [], legacy });
  const [valorant, league] = workspace.getSnapshot().entries.map((entry) => entry.editor);
  valorant.edit({ ign: "NewName#SEA" });
  league.edit({ roleId: "r1" });
  const pending = valorant.save();
  await league.save();
  release();
  await pending;
  assert.equal(writes, 1);
  assert.equal(league.getSnapshot().draft.ign, "NewName#SEA");
  assert.equal(league.getSnapshot().dirty, true);
  await league.save();
  assert.equal(writes, 2);
});
