import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Game } from "../src/features/admin/features/games/services/games.service";

const reactUrl = import.meta.resolve("react");
const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.endsWith("/MemberShell"))
      return {
        url: `data:text/javascript,${encodeURIComponent(`import{createElement}from'${reactUrl}';export const techFieldClass='field';export const TechPanel=({label,title,children})=>createElement('section',null,label,title,children);`)}`,
        shortCircuit: true,
      };
    return next(specifier, context);
  },
});
const { GameIdentitiesFields } =
  await import("../src/features/member/components/GameIdentitiesFields");
hook.deregister();
const props = {
  mainGame: "Palworld",
  focusGame: "Palworld",
  valorantGameName: "StoredRiot",
  valorantTagline: "TAG",
  gameIdentities: { Palworld: "StoredBuilder", "Where Winds Meet": "StoredWanderer" },
  onValorantGameNameChange() {},
  onValorantTaglineChange() {},
  onGameIdentityChange() {},
};
const palworld = {
  id: "pal",
  name: "Palworld",
  display_name: "Palworld",
  slug: "palworld",
  is_active: true,
} as Game;

test("legacy identity fields cannot restore games from an absent, empty or inactive catalog", () => {
  for (const games of [undefined, [], [{ ...palworld, is_active: false }]]) {
    const html = renderToStaticMarkup(createElement(GameIdentitiesFields, { ...props, games }));
    assert.doesNotMatch(html, /<input\b|StoredBuilder|StoredRiot|StoredWanderer/);
  }
});

test("legacy secondary identity panels do not reintroduce inactive saved games", () => {
  const original = structuredClone(props.gameIdentities);
  const html = renderToStaticMarkup(
    createElement(GameIdentitiesFields, { ...props, games: [palworld] }),
  );
  assert.match(html, /StoredBuilder/);
  assert.doesNotMatch(
    html,
    /StoredRiot|StoredWanderer|Where Winds Meet|Marvel Rivals|Valorant|League of Legends|Teamfight Tactics/,
  );
  assert.deepEqual(props.gameIdentities, original);
});

test("legacy shared Riot identity labels name only active Riot titles", () => {
  const valorant = {
    ...palworld,
    id: "val",
    name: "Valorant",
    display_name: "Valorant",
    slug: "valorant",
    identity_group: "riot",
  };
  const input = { ...props, mainGame: "Valorant", focusGame: "Valorant", games: [valorant] };
  const html = renderToStaticMarkup(createElement(GameIdentitiesFields, input));
  assert.match(html, /StoredRiot/);
  assert.doesNotMatch(html, /League of Legends|Teamfight Tactics|Palworld|StoredBuilder/);
});
