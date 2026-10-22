import assert from "node:assert/strict";
import test from "node:test";
import type { Game } from "../src/features/admin/features/games/services/games.service";
import { projectActiveGameVisibility } from "../src/features/member/utils/active-game-visibility";

function game(overrides: Partial<Game> = {}): Game {
  return {
    id: "palworld-id",
    name: "Palworld",
    slug: "palworld",
    display_name: "Palworld",
    is_active: true,
    identity_group: null,
    identity_field_label: null,
    identity_field_placeholder: null,
    identity_helper_text: null,
    accent_class: "",
    tournament_header_image: null,
    icon: null,
    sort_order: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}
const source = {
  mainGame: "PALWORLD",
  mainRole: "Support",
  valorantGameName: "Rose",
  valorantTagline: "BR1",
  gameIdentities: { Palworld: "Builder", "Where Winds Meet": "Wanderer" },
  acceptedGameMemberships: [{ gameId: "palworld-id", gameName: "Palworld", gameIcon: null }],
};

test("active to inactive to reactivated projects preferences without changing stored data", () => {
  const original = structuredClone(source);
  const active = projectActiveGameVisibility(source, [game()]);
  assert.equal(active.mainGame, "PALWORLD");
  assert.equal(active.mainRole, "Support");
  const inactive = projectActiveGameVisibility(source, [game({ is_active: false })]);
  assert.equal(inactive.mainGame, "");
  assert.equal(inactive.mainRole, "");
  assert.deepEqual(projectActiveGameVisibility(source, [game()]), active);
  assert.deepEqual(source, original);
});

test("identities and accepted badges fail closed without an active catalog", () => {
  for (const catalog of [undefined, [], [game({ is_active: false })]]) {
    const projected = projectActiveGameVisibility(source, catalog);
    assert.deepEqual(projected.identitySummaries, []);
    assert.deepEqual(projected.acceptedGameMemberships, []);
  }
});

test("shared Riot identities label only active titles and do not mark an inactive main game", () => {
  const riotGame = game({
    id: "lol-id",
    name: "lol",
    slug: "league-of-legends",
    display_name: "League of Legends",
  });
  const projected = projectActiveGameVisibility({ ...source, mainGame: "Valorant" }, [riotGame]);
  assert.deepEqual(projected.identitySummaries, [
    {
      key: "riot",
      label: "Riot ID",
      games: ["League of Legends"],
      display: "Rose#BR1",
      isMain: false,
    },
  ]);
  const activeMain = projectActiveGameVisibility({ ...source, mainGame: " LoL " }, [riotGame]);
  assert.equal(activeMain.identitySummaries[0].isMain, true);
});

test("legacy aliases and case-insensitive custom titles project identities without mutating inputs", () => {
  const stored = {
    ...source,
    mainGame: "wwm",
    gameIdentities: { WWM: "Wanderer", "aION 2": "Ascendant", PALWORLD: "Builder" },
    acceptedGameMemberships: [
      ...source.acceptedGameMemberships,
      { gameId: "aion-id", gameName: "Old display name", gameIcon: null },
      { gameId: "inactive-id", gameName: "Where Winds Meet", gameIcon: null },
    ],
  };
  const original = structuredClone(stored);
  const catalog = [
    game({
      id: "wwm-id",
      name: "Where Winds Meet",
      slug: "where-winds-meet",
      display_name: "Where Winds Meet",
    }),
    game({ id: "aion-id", name: "aion-2", slug: "aion-2", display_name: "Aion 2" }),
  ];
  const active = projectActiveGameVisibility(stored, catalog);
  assert.equal(active.mainGame, "wwm");
  assert.deepEqual(
    active.identitySummaries.map((entry) => entry.display),
    ["Wanderer", "Ascendant"],
  );
  assert.deepEqual(
    active.acceptedGameMemberships.map((entry) => entry.gameId),
    ["aion-id"],
  );
  const inactive = projectActiveGameVisibility(stored, []);
  assert.deepEqual(inactive.identitySummaries, []);
  assert.deepEqual(inactive.acceptedGameMemberships, []);
  assert.deepEqual(projectActiveGameVisibility(stored, catalog), active);
  assert.deepEqual(stored, original);
});
