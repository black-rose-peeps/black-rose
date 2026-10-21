import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Replace only external I/O. Exercise the real service, query shape, pagination and mapper.
const selections: string[] = [];
const ranges: number[] = [];
let rows: Record<string, unknown>[] = [];
let apiLimit = 1000;
let failAt: number | null = null;
const database = {
  from(table: string) {
    assert.equal(table, "members");
    const query = {
      select(columns: string) {
        selections.push(columns);
        return query;
      },
      order() {
        return query;
      },
      update() {
        return query;
      },
      eq() {
        return query;
      },
      async single() {
        return { data: rows[0], error: null };
      },
      async range(from: number, to: number) {
        ranges.push(from);
        if (from === failAt) return { data: null, error: { message: "Read failed" } };
        return { data: rows.slice(from, Math.min(to + 1, from + apiLimit)), error: null };
      },
    };
    return query;
  },
};
Object.assign(globalThis, { __memberDirectoryTestDb: database });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase") {
      return {
        url: "data:text/javascript,export const supabase = globalThis.__memberDirectoryTestDb;",
        shortCircuit: true,
      };
    }
    if (specifier.includes("audit-log.service")) {
      return {
        url: "data:text/javascript,export const ADMIN_AUDIT_ACTIONS = {}; export async function logAdminAction() {}",
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
const service = await import("../src/features/admin/features/members/services/members.service");
hooks.deregister();

function reset(count: number) {
  rows = Array.from({ length: count }, (_, index) => ({
    id: `member-${index}`,
    username: `player-${index}`,
    status: "Not Verified",
    member_profiles: {
      main_game: "Palworld",
      main_role: "Builder",
      game_identities: { Palworld: "Player" },
    },
  }));
  selections.length = 0;
  ranges.length = 0;
  failAt = null;
  apiLimit = 1000;
}

test("directory loads beyond the API row cap, including the last partial batch", async () => {
  reset(1501);
  const members = await service.fetchMembers();
  assert.equal(members.length, 1501);
  assert.equal(members.at(-1)?.id, "member-1500");
  assert.deepEqual(ranges, [0, 1000, 1501]);
  assert.ok(
    selections.every(
      (columns) => columns.includes("game_identities") && columns.includes("main_role"),
    ),
  );
});

test("directory tolerates an API cap smaller than its requested batch", async () => {
  reset(8);
  apiLimit = 3;
  assert.equal((await service.fetchMembers()).length, 8);
  assert.deepEqual(ranges, [0, 3, 6, 8]);
});

test("a failed later batch rejects instead of exporting a silently incomplete roster", async () => {
  reset(1501);
  failAt = 1000;
  await assert.rejects(service.fetchMembers(), /Read failed/);
});

test("verification, queue reset and edit responses retain profile identity/role fields", async () => {
  reset(1);
  const responses = [
    await service.updateMemberVerificationStatus("member-0", "Verified"),
    await service.resetMemberDiscordSyncQueue("member-0"),
    await service.updateMember("member-0", {
      username: "player",
      discordUsername: "player.discord",
      status: "Not Verified",
    }),
  ];
  for (const response of responses) {
    assert.equal(response.mainGame, "Palworld");
    assert.equal(response.mainRole, "Builder");
    assert.deepEqual(response.gameIdentities, { Palworld: "Player" });
  }
  assert.ok(
    selections.every(
      (columns) => columns.includes("member_profiles(") && columns.includes("game_identities"),
    ),
  );
});
