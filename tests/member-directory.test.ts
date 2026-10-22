import assert from "node:assert/strict";
import test from "node:test";
import * as directory from "../src/features/admin/features/members/utils/member-directory";
import type { AdminMember } from "../src/features/admin/features/members/types";
import { rowToAdminMember } from "../src/features/admin/features/members/utils";

const game = {
  id: "wwm",
  name: "where-winds-meet",
  slug: "where-winds-meet",
  display_name: "Where Winds Meet",
  identity_group: null,
};
const member = (fields: Partial<AdminMember> = {}): AdminMember => ({
  id: "member",
  username: "player",
  displayName: "Player",
  discordUsername: "player.discord",
  status: "Not Verified",
  registeredAt: "2026-10-18",
  createdAt: "2026-10-18T00:00:00Z",
  avatarUrl: null,
  profileSlug: "player",
  discordNotInGuildStrikes: 0,
  discordSyncPausedAt: null,
  ...fields,
});

test("configured name and display-name aliases match trimmed game identities", () => {
  assert.equal(
    directory.getDirectoryIdentity(
      member({ gameIdentities: { " WHERE-WINDS-MEET ": "  Wanderer  " } }),
      game,
    ),
    "Wanderer",
  );
});

test("main-game legacy identity fallback does not leak to secondary games", () => {
  const player = member({
    mainGame: " Where Winds Meet ",
    ingameDisplayName: " Old Name ",
    gameIdentities: { Palworld: "Other" },
  });
  assert.equal(directory.getDirectoryIdentity(player, game), "Old Name");
  assert.equal(
    directory.getDirectoryIdentity(member({ ...player, mainGame: "Palworld" }), game),
    null,
  );
  assert.equal(
    directory.getDirectoryIdentity(member({ gameIdentities: { "Where Winds Meet": "  " } }), game),
    null,
  );
});

test("legacy abbreviations retain identity, main-game roles and CSV fields", () => {
  for (const [alias, displayName] of [
    ["WWM", "Where Winds Meet"],
    ["LoL", "League of Legends"],
    ["TFT", "Teamfight Tactics"],
    ["MR", "Marvel Rivals"],
  ]) {
    const selectedGame = { ...game, name: displayName, display_name: displayName };
    const player = member({
      mainGame: ` ${alias} `,
      mainRole: "Support",
      gameIdentities: { [alias]: "LegacyPlayer" },
    });
    assert.equal(directory.getDirectoryIdentity(player, selectedGame), "LegacyPlayer", alias);
    assert.equal(directory.getDirectoryRole(player, selectedGame), "Support", alias);
    assert.equal(
      directory.matchesDirectoryFilter(player, selectedGame, "main", "role:Support"),
      true,
      alias,
    );
    assert.ok(
      directory
        .buildMemberDirectoryCsv([player], selectedGame)
        .includes('"LegacyPlayer","Support"'),
      alias,
    );
  }
});

test("secondary identities never borrow the main game's role", () => {
  const player = member({
    mainGame: "Palworld",
    mainRole: "Healer",
    gameIdentities: { "Where Winds Meet": "Wanderer" },
  });
  assert.equal(directory.getDirectoryRole(player, game), null);
  assert.equal(directory.matchesDirectoryFilter(player, game, "identity", "all"), true);
  assert.equal(directory.matchesDirectoryFilter(player, game, "identity", "role:Healer"), false);
  assert.equal(directory.matchesDirectoryFilter(player, game, "identity", "unknown"), true);
  assert.equal(directory.matchesDirectoryFilter(player, game, "main", "all"), false);
  assert.equal(
    directory.matchesDirectoryFilter(
      member({ mainGame: "where-winds-meet", mainRole: " healer " }),
      game,
      "main",
      "role:Healer",
    ),
    true,
  );
  assert.equal(directory.matchesDirectoryFilter(player, null, "main", "role:Healer"), true);
});

test("shared Riot account display is honestly labeled, complete, and not used for unrelated games", () => {
  const riot = { ...game, name: "valorant", display_name: "Valorant", identity_group: "riot" };
  const player = member({ valorantGameName: " Rose ", valorantTagline: " #SEA " });
  assert.equal(directory.getDirectoryIdentity(player, riot), "Rose#SEA");
  assert.equal(directory.getDirectoryIdentityLabel(riot), "Shared Riot ID");
  assert.equal(directory.getDirectoryIdentity(player, game), null);
  assert.equal(directory.getDirectoryIdentity(member({ valorantGameName: "Rose" }), riot), null);
});

test("CSV includes every supplied match and excludes sensitive/unrequested fields", () => {
  const players = Array.from({ length: 31 }, (_, index) =>
    member({
      id: `id-${index}`,
      displayName: `Name ${index}`,
      discordId: "private-id",
      mainGame: "Where Winds Meet",
      mainRole: "Healer",
      gameIdentities: { "Where Winds Meet": "Wanderer" },
    }),
  );
  const csv = directory.buildMemberDirectoryCsv(players, game);
  assert.equal(csv.split("\r\n").length, 32);
  assert.ok(csv.includes('"Name 30"'));
  assert.ok(csv.includes('"Wanderer","Healer"'));
  assert.ok(!csv.includes("private-id"));
  assert.ok(!csv.includes("id-30"));
});

test("CSV quotes delimiters/newlines and neutralizes spreadsheet formulas", () => {
  const csv = directory.buildMemberDirectoryCsv(
    [
      member({
        displayName: 'Rose,"Red"\nNext',
        discordUsername: ' \t=HYPERLINK("evil")',
        mainGame: "+cmd",
        mainRole: "@role",
      }),
    ],
    null,
  );
  assert.ok(csv.includes('"Rose,""Red""\nNext"'));
  assert.ok(csv.includes('"\' \t=HYPERLINK(""evil"")"'));
  assert.ok(csv.includes('"\'+cmd"'));
  assert.ok(csv.includes('"\'@role"'));
  for (const prefix of ["=", "+", "-", "@", "\t", "\r", "\n"]) {
    assert.ok(
      directory
        .buildMemberDirectoryCsv([member({ displayName: `${prefix}payload` })], null)
        .includes(`"'${prefix}payload"`),
    );
  }
});

test("profile mapping supports object/array joins and safely ignores malformed identity values", () => {
  const profile = {
    main_game: " Where Winds Meet ",
    main_role: " Healer ",
    game_identities: { Palworld: " Pal ", invalid: 42, empty: "  " },
    ingame_display_name: " Legacy ",
    valorant_game_name: "Rose",
    valorant_tagline: "SEA",
  };
  for (const member_profiles of [profile, [profile]]) {
    const mapped = rowToAdminMember({ id: "one", username: "one", member_profiles });
    assert.equal(mapped.mainGame, "Where Winds Meet");
    assert.equal(mapped.mainRole, "Healer");
    assert.deepEqual(mapped.gameIdentities, { Palworld: "Pal" });
    assert.equal(directory.getDirectoryIdentity(mapped, game), "Legacy");
    assert.equal(mapped.valorantGameName, "Rose");
  }
  assert.equal(rowToAdminMember({ id: "one", username: "one" }).mainGame, undefined);
  assert.deepEqual(
    rowToAdminMember({ id: "one", username: "one", member_profiles: null }).gameIdentities,
    {},
  );
});
