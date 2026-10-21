import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSaveGameProfileInput,
  validateGameProfile,
  memberTransition,
  parseMemberAction,
  parseAdminMembershipInput,
  matchesCatalogGame,
} from "../src/features/game-membership/rules";
import type { MembershipGame, MemberGameProfile } from "../src/features/game-membership/types";

const gameId = "11111111-1111-4111-8111-111111111111";
const roleId = "22222222-2222-4222-8222-222222222222";
const input = {
  gameId,
  ign: "Daeva",
  roleId,
  className: "Templar",
  serverName: "SEA",
  faction: "",
};
const game = {
  id: gameId,
  name: "Aion 2",
  display_name: "Aion 2",
  slug: "aion-2",
  is_active: true,
  roles: [{ id: roleId, game_id: gameId, role_name: "Tank", is_active: true }],
  profile_field_config: {
    class: { enabled: true, label: "Class", kind: "select", options: ["Templar", "Cleric"] },
    server: { enabled: true, label: "Server", kind: "text", options: [] },
  },
} as unknown as MembershipGame;

test("game-profile input rejects identity spoofing, malformed IDs and uncontrolled fields", () => {
  assert.deepEqual(parseSaveGameProfileInput(input), input);
  assert.throws(() => parseSaveGameProfileInput({ ...input, memberId: gameId }), /Unexpected/);
  assert.throws(() => parseSaveGameProfileInput({ ...input, gameId: "bad-id" }), /gameId/);
  assert.throws(() => parseSaveGameProfileInput({ ...input, ign: "bad\nname" }), /control/);
});
test("per-game validation uses this game's roles and enabled optional-field configuration", () => {
  assert.deepEqual(validateGameProfile(input, game, null, null), input);
  assert.throws(() => validateGameProfile({ ...input, roleId: gameId }, game, null, null), /role/i);
  assert.throws(
    () => validateGameProfile({ ...input, className: "Unknown" }, game, null, null),
    /Class/,
  );
  assert.throws(
    () => validateGameProfile(input, { ...game, is_active: false }, null, null),
    /inactive/i,
  );
});
test("configuration changes preserve disabled values and unchanged retired roles/options", () => {
  const saved = {
    ...input,
    memberId: gameId,
    roleLabel: "Tank",
    updatedAt: "2026-01-01",
  } as MemberGameProfile;
  const changed = {
    ...game,
    roles: [{ ...game.roles[0], is_active: false }],
    profile_field_config: {
      class: { enabled: true, label: "Class", kind: "select" as const, options: ["Cleric"] },
    },
  };
  assert.equal(
    validateGameProfile({ ...input, serverName: "" }, changed, saved, null).serverName,
    "SEA",
  );
  assert.equal(validateGameProfile(input, changed, saved, null).className, "Templar");
  assert.throws(() => validateGameProfile(input, changed, null, null), /role/i);
});
test("accepted or applying membership cannot lose its saved identity through a profile edit", () => {
  assert.throws(() => validateGameProfile({ ...input, ign: "" }, game, null, "accepted"), /IGN/);
  assert.throws(() => validateGameProfile({ ...input, ign: "" }, game, null, "applying"), /IGN/);
  assert.equal(validateGameProfile({ ...input, ign: "" }, game, null, null).ign, "");
});
test("member actions never grant accepted/inactive status or downgrade an accepted membership to interest", () => {
  assert.equal(memberTransition(null, "interest", false, true), "interested");
  assert.equal(memberTransition("interested", "apply", true, true), "applying");
  assert.equal(memberTransition("applying", "withdraw", true, true), "interested");
  assert.equal(memberTransition("accepted", "leave", true, false), "left");
  assert.throws(() => memberTransition("accepted", "interest", true, true), /transition/i);
  assert.throws(() => memberTransition(null, "apply", false, true), /IGN/);
  assert.throws(() => memberTransition(null, "apply", true, false), /inactive/i);
  assert.throws(() => parseMemberAction({ gameId, action: "accept" }), /action/);
  assert.throws(
    () => parseMemberAction({ gameId, action: "apply", status: "accepted" }),
    /Unexpected/,
  );
});
test("admin status parsing is explicit and directory aliases remain compatible", () => {
  assert.equal(
    parseAdminMembershipInput({ memberId: gameId, gameId, status: "accepted", reason: "Reviewed" })
      .status,
    "accepted",
  );
  assert.throws(
    () => parseAdminMembershipInput({ memberId: gameId, gameId, status: "verified" }),
    /status/,
  );
  assert.equal(
    matchesCatalogGame("WWM", {
      name: "Where Winds Meet",
      display_name: "Where Winds Meet",
      slug: "where-winds-meet",
    }),
    true,
  );
  assert.equal(matchesCatalogGame("Valorant", game), false);
});

test("Riot profile saves permit empty drafts and the same six-character tagline supported by legacy identity validation", () => {
  const riot = { ...game, identity_group: "riot" };
  assert.equal(validateGameProfile({ ...input, ign: "" }, riot, null, null).ign, "");
  assert.equal(
    validateGameProfile({ ...input, ign: "Rose#A!1234" }, riot, null, null).ign,
    "Rose#A!1234",
  );
  assert.throws(() => validateGameProfile({ ...input, ign: "" }, riot, null, "accepted"), /IGN/);
  assert.throws(
    () => validateGameProfile({ ...input, ign: "Rose#1234567" }, riot, null, null),
    /Tagline/,
  );
});

test("profile saves reject malformed catalog field configuration before RPC dispatch", () => {
  const config = {
    class: { enabled: true, label: "Class", kind: "select", options: ["Mage", "Mage"] },
  };
  assert.throws(
    () =>
      validateGameProfile(
        input,
        { ...game, profile_field_config: config } as MembershipGame,
        null,
        null,
      ),
    /unique/,
  );
});
