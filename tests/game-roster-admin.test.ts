import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGameRosterCsv,
  filterGameRoster,
  gameMembershipChangeError,
  submitAdminMembershipChange,
} from "../src/features/game-membership/components/admin-roster-utils";
import type { GameRosterEntry, MembershipGame } from "../src/features/game-membership/types";
const game = {
  id: "g",
  display_name: "Test",
  is_active: true,
  roles: [],
  profile_field_config: {
    class: { enabled: true, label: "Class", kind: "select", options: ["Mage"] },
  },
} as unknown as MembershipGame;
const row: GameRosterEntry = {
  memberId: "private-uuid",
  displayName: '=HYPERLINK("evil")',
  discordUsername: "@user",
  mainGame: "Test",
  verificationStatus: "Verified",
  membership: null,
  profile: {
    memberId: "private-uuid",
    gameId: "g",
    ign: "Rose",
    roleId: null,
    roleLabel: "Old role",
    className: "Mage",
    serverName: "Private realm",
    faction: "",
    updatedAt: "",
  },
};
test("roster never infers acceptance from saved IGN, verification or main game", () => {
  assert.equal(filterGameRoster([row], { status: "accepted" }, "").length, 0);
  assert.equal(filterGameRoster([row], {}, "rose").length, 1);
  assert.equal(filterGameRoster([row], { className: "Warrior" }, "").length, 0);
});
test("roster filters compose and can isolate saved profiles without membership", () => {
  const accepted = {
    ...row,
    memberId: "accepted",
    membership: { memberId: "accepted", gameId: "g", status: "accepted" as const, updatedAt: "" },
  };
  assert.deepEqual(
    filterGameRoster([row, accepted], { status: "none", className: "Mage" }, "rose"),
    [row],
  );
  assert.equal(
    filterGameRoster([row, accepted], { status: "none", className: "Warrior" }, "rose").length,
    0,
  );
});

test("CSV exports every filtered row, configured fields only, formula-safe minimal fields", () => {
  const rows = Array.from({ length: 31 }, () => row);
  const csv = buildGameRosterCsv(game, rows);
  assert.equal(csv.split("\r\n").length, 32);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes("'@user"));
  assert.ok(csv.includes("Old role"));
  assert.ok(!csv.includes("private-uuid"));
  assert.ok(!csv.includes("Private realm"));
  assert.ok(!csv.includes("Verified"));
  assert.ok(csv.includes("No membership"));
});
test("accepted/applying require saved IGN; inactive games only allow inactive/left", () => {
  assert.match(gameMembershipChangeError(game, { ...row, profile: null }, "accepted")!, /IGN/);
  assert.match(
    gameMembershipChangeError(
      game,
      { ...row, profile: { ...row.profile!, ign: " " } },
      "applying",
    )!,
    /IGN/,
  );
  assert.match(
    gameMembershipChangeError({ ...game, is_active: false }, row, "interested")!,
    /inactive/i,
  );
  assert.equal(gameMembershipChangeError({ ...game, is_active: false }, row, "left"), null);
});
test("duplicate pending admin changes share one write and release the target after failure", async () => {
  let writes = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const save = async () => {
    writes++;
    await gate;
    throw new Error("Try again");
  };
  const first = submitAdminMembershipChange(game, row, "accepted", "", save, async () => {});
  const duplicate = submitAdminMembershipChange(game, row, "accepted", "", save, async () => {});
  release();
  await Promise.all([assert.rejects(first, /Try again/), assert.rejects(duplicate, /Try again/)]);
  assert.equal(writes, 1);
  await submitAdminMembershipChange(
    game,
    row,
    "accepted",
    "",
    async () => {
      writes++;
    },
    async () => {},
  );
  assert.equal(writes, 2);
});

test("refresh failure reports the saved write instead of implying that saving failed", async () => {
  await assert.rejects(
    submitAdminMembershipChange(
      game,
      row,
      "left",
      "",
      async () => {},
      async () => {
        throw new Error("Offline");
      },
    ),
    /saved.*Retry roster/i,
  );
});

test("admin status submits exact target and optional reason, then refreshes; failures propagate", async () => {
  const calls: unknown[] = [];
  await submitAdminMembershipChange(
    game,
    row,
    "accepted",
    " Approved ",
    async (input) => {
      calls.push(input);
    },
    async () => {
      calls.push("refresh");
    },
  );
  assert.deepEqual(calls, [
    { memberId: "private-uuid", gameId: "g", status: "accepted", reason: "Approved" },
    "refresh",
  ]);
  await assert.rejects(
    submitAdminMembershipChange(
      game,
      row,
      "left",
      "",
      async () => {
        throw new Error("Server denied");
      },
      async () => {
        throw new Error("Must not refresh");
      },
    ),
    /Server denied/,
  );
});
