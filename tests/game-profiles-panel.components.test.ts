import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerHooks } from "node:module";
const assets = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith("/MemberShell"))
      return {
        url: "data:text/javascript,export const techFieldClass = 'test-field'",
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
const { GameProfileCard } =
  await import("../src/features/game-membership/components/GameProfileCard");
const { GameProfilesPanel } =
  await import("../src/features/game-membership/components/GameProfilesPanel");
assets.deregister();
import { createGameProfileEditor } from "../src/features/game-membership/components/game-profile-editor";
import type { MembershipGame, MemberGameProfile } from "../src/features/game-membership/types";

const game = {
  id: "g1",
  name: "Palworld",
  display_name: "Palworld",
  slug: "palworld",
  is_active: true,
  roles: [
    { id: "new", role_name: "Builder", is_active: true },
    { id: "disabled", role_name: "Hidden role", is_active: false },
  ],
  profile_field_config: {
    class: { enabled: true, label: "Specialty", kind: "select", options: ["Engineer"] },
    server: { enabled: false, label: "Server", kind: "text", options: [] },
  },
} as unknown as MembershipGame;
const legacy = {
  mainGame: "Other",
  mainRole: "",
  valorantGameName: "",
  valorantTagline: "",
  gameIdentities: {},
  ingameDisplayName: "",
};
const profile: MemberGameProfile = {
  memberId: "me",
  gameId: "g1",
  ign: "Rose",
  roleId: "retired",
  roleLabel: "Old role",
  className: "Old class",
  serverName: "Old server",
  faction: "",
  updatedAt: "",
};
const api = {
  async saveProfile() {
    return profile;
  },
  async changeMembership() {
    throw new Error("not used");
  },
};
function render(selectedGame = game, selectedProfile: MemberGameProfile | null = profile) {
  const editor = createGameProfileEditor(selectedGame, selectedProfile, null, legacy, api);
  return renderToStaticMarkup(createElement(GameProfileCard, { game: selectedGame, editor }));
}

test("the integrated panel separates game saves from common preferences and provides retry and empty states", () => {
  const editor = createGameProfileEditor(game, profile, null, legacy, api);
  const html = renderToStaticMarkup(
    createElement(GameProfilesPanel, {
      entries: [{ game, editor }],
      loading: false,
      error: null,
      onRetry() {},
    }),
  );
  assert.match(html, /Game profiles &amp; memberships/);
  assert.match(html, /one primary character per game/i);
  assert.match(html, /saved separately/i);
  assert.match(html, /privacy/i);
  assert.match(html, /Palworld/);
  assert.doesNotMatch(html, /<form|type="submit"/);
  const failed = renderToStaticMarkup(
    createElement(GameProfilesPanel, {
      entries: [],
      loading: false,
      error: "Connection lost",
      onRetry() {},
    }),
  );
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Connection lost/);
  assert.match(failed, /Retry/);
  const empty = renderToStaticMarkup(
    createElement(GameProfilesPanel, { entries: [], loading: false, error: null, onRetry() {} }),
  );
  assert.match(empty, /No games available/);
});

test("compact game list exposes status and opens only the focused game editor", () => {
  const other = { ...game, id: "g2", name: "Other", display_name: "Other", slug: "other" };
  const first = createGameProfileEditor(game, profile, null, legacy, api);
  const second = createGameProfileEditor(
    other,
    { ...profile, gameId: "g2" },
    {
      memberId: "me",
      gameId: "g2",
      status: "accepted",
      updatedAt: "",
    },
    legacy,
    api,
  );
  const html = renderToStaticMarkup(
    createElement(GameProfilesPanel, {
      entries: [
        { game, editor: first },
        { game: other, editor: second },
      ],
      loading: false,
      error: null,
      onRetry() {},
      focusGame: "other",
    }),
  );
  assert.match(html, /aria-label="Your games"/);
  assert.match(html, /Accepted/);
  assert.match(html, /Not joined/);
  assert.match(html, /id="game-profile-g2"/);
  assert.doesNotMatch(html, /id="game-profile-g1"/);
  assert.equal((html.match(/Save game profile/g) ?? []).length, 1);
});

test("rendered game controls keep failed drafts retryable and report pending and successful saves independently", async () => {
  let fail = true;
  let finish!: (value: MemberGameProfile) => void;
  const editor = createGameProfileEditor(game, profile, null, legacy, {
    ...api,
    async saveProfile(input) {
      if (fail) throw new Error("Connection lost — save again");
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const html = () => renderToStaticMarkup(createElement(GameProfileCard, { game, editor }));
  editor.edit({ ign: "Draft Rose" });
  assert.match(html(), /Unsaved game profile changes/);
  await editor.save();
  assert.match(html(), /role="alert"/);
  assert.match(html(), /Connection lost/);
  assert.match(html(), /value="Draft Rose"/);
  fail = false;
  const pending = editor.save();
  assert.match(html(), /Saving…/);
  assert.match(html(), /<fieldset disabled/);
  finish({ ...profile, ign: "Draft Rose" });
  await pending;
  assert.match(html(), /Game profile saved. Membership unchanged./);
  assert.match(html(), /Not joined/);
  assert.doesNotMatch(html(), /Unsaved game profile changes/);
});

test("game cards explicitly separate saved identity from membership and preserve retired choices visibly", () => {
  const html = render();
  assert.match(html, /Not joined/);
  assert.match(html, /Save game profile/);
  assert.match(html, /Apply to join/);
  assert.match(html, /Old role \(retired; saved\)/);
  assert.match(html, /Old class \(retired; saved\)/);
  assert.match(html, /Specialty/);
  assert.match(html, /Old server/);
  assert.match(html, /Server.*disabled/s);
  assert.doesNotMatch(html, /Hidden role/);
  assert.doesNotMatch(html, /<form/);
  assert.doesNotMatch(html, /type="submit"/);
  assert.doesNotMatch(html, /Accept member|Set inactive/);
});

test("inactive game membership exit controls remain outside the read-only identity fieldset", () => {
  const inactive = { ...game, is_active: false };
  const editor = createGameProfileEditor(
    inactive,
    profile,
    { memberId: "me", gameId: game.id, status: "applying", updatedAt: "" },
    legacy,
    api,
  );
  const html = renderToStaticMarkup(createElement(GameProfileCard, { game: inactive, editor }));
  assert.match(html, /<fieldset disabled/);
  assert.match(html, /<\/fieldset>.*Withdraw application/s);
  assert.match(html, /<button(?![^>]*\sdisabled=)[^>]*>Withdraw application<\/button>/);
  assert.doesNotMatch(html, /Save game profile|Apply to join|Mark interested/);
});

test("inactive games keep existing identities visible but are read-only", () => {
  const html = render({ ...game, is_active: false });
  assert.match(html, /Game inactive/);
  assert.match(html, /read-only/);
  assert.match(html, /Rose/);
  assert.doesNotMatch(html, /Apply to join|Mark interested/);
});
