import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const fixture = { rows: [] as unknown[], loading: false, error: null as Error | null };
Object.assign(globalThis, { __adminRosterFixture: fixture });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith("/services/game-membership.service"))
      return {
        url: "data:text/javascript,export async function fetchGameRoster(){throw Error('No real calls in tests')} export async function changeGameMembershipAsAdmin(){throw Error('No real calls in tests')}",
        shortCircuit: true,
      };
    if (specifier === "@tanstack/react-query")
      return {
        url: "data:text/javascript,export function useQuery(){const f=globalThis.__adminRosterFixture;return {data:f.rows,isLoading:f.loading,error:f.error,refetch:async()=>({})}}",
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
const { GameRosterPanel, GameRosterMemberDetails } =
  await import("../src/features/game-membership/components/GameRosterPanel");
hooks.deregister();
const game = {
  id: "g",
  display_name: "Test",
  is_active: true,
  roles: [
    { id: "r", role_name: "Tank" },
    { id: "old", role_name: "Retired", is_active: false },
  ],
  profile_field_config: {
    class: { enabled: true, label: "Specialization", kind: "text", options: [] },
  },
} as never;
const props = { games: [game], selectedGame: null, onGameChange() {} };
test("admin roster requires a game and explicitly distinguishes membership from verification", () => {
  const html = renderToStaticMarkup(createElement(GameRosterPanel, props));
  assert.match(html, /Select a game/);
  assert.match(html, /Discord verification/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-label="Roster game"/);
  assert.ok(!html.includes("Export CSV"));
});
test("selected game keeps secondary filters behind an accessible closed disclosure", () => {
  const html = renderToStaticMarkup(
    createElement(GameRosterPanel, { ...props, selectedGame: game }),
  );
  assert.match(html, /Accepted/);
  assert.match(html, /More filters/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /for="game-roster-search"/);
  assert.match(html, /for="game-roster-status"/);
  assert.ok(!html.includes('for="game-roster-role"'));
  assert.ok(!html.includes('for="game-roster-class"'));
  assert.ok(!html.includes('value="old"'));
  assert.ok(!html.includes('for="game-roster-server"'));
  assert.match(html, /not just this page/);
  assert.match(html, /No saved profiles or memberships/);
  assert.match(html, /aria-label="Roster filters"/);
  assert.match(html, /0 matching entries/);
});
test("member details contain the only status form, optional reason and saved-IGN validation", () => {
  const html = renderToStaticMarkup(
    createElement(GameRosterMemberDetails, {
      game,
      row: {
        memberId: "m",
        displayName: "Rose",
        discordUsername: "rose",
        profile: null,
        membership: { status: "accepted" },
      } as never,
      refresh: async () => {},
    }),
  );
  assert.equal((html.match(/<form/g) ?? []).length, 1);
  assert.match(html, /Optional reason/);
  assert.match(html, /A saved IGN is required/);
  assert.match(html, /type="submit"[^>]*disabled/);
  assert.match(html, /Specialization/);
});

test("roster rows stay focused while configured character details remain in the drawer", () => {
  const row = {
    memberId: "compact",
    displayName: "Compact Rose",
    discordUsername: "compact.rose",
    profile: { ign: "Primary IGN", roleId: "r", roleLabel: "Tank", className: "Arcane build" },
    membership: { status: "accepted" },
  };
  fixture.rows = [row];
  try {
    const html = renderToStaticMarkup(
      createElement(GameRosterPanel, { ...props, selectedGame: game }),
    );
    assert.match(html, /Primary IGN/);
    assert.match(html, /Tank/);
    assert.doesNotMatch(html, /Specialization|Arcane build/);
    const details = renderToStaticMarkup(
      createElement(GameRosterMemberDetails, { game, row: row as never, refresh: async () => {} }),
    );
    assert.match(details, /Specialization/);
    assert.match(details, /Arcane build/);
  } finally {
    fixture.rows = [];
  }
});

test("inactive history keeps status management restricted and errors useful", () => {
  fixture.rows = [
    {
      memberId: "m",
      displayName: "Rose",
      discordUsername: "rose",
      profile: null,
      membership: { status: "accepted" },
    },
  ];
  const html = renderToStaticMarkup(
    createElement(GameRosterPanel, {
      ...props,
      selectedGame: { ...(game as object), is_active: false } as never,
    }),
  );
  assert.match(html, /Saved IGN not provided/);
  assert.match(html, /Only inactive or left/);
  assert.match(html, /View member details/);
  assert.match(html, /Membership: Accepted/);
  assert.doesNotMatch(html, /<form|Optional reason|Save status/);
  fixture.error = new Error("Roster access denied");
  const errorHtml = renderToStaticMarkup(
    createElement(GameRosterPanel, { ...props, selectedGame: game }),
  );
  assert.match(errorHtml, /Roster access denied/);
  assert.match(errorHtml, /Retry/);
  fixture.rows = [];
  fixture.error = null;
});
