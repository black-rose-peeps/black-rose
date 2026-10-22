import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import {
  DISCORD_GAME_GUILD_ID,
  DISCORD_GAME_ROLE_MAPPINGS,
} from "../src/features/game-membership/discord-role-proof";
const memberId = "11111111-1111-4111-8111-111111111111",
  gameId = "22222222-2222-4222-8222-222222222222",
  discordId = "111111111111111111";
const f = {
  row: null as Record<string, unknown> | null,
  reads: [] as string[],
  rpcs: [] as Record<string, unknown>[],
  network: 0,
  unavailable: false,
};
Object.assign(globalThis, { __discordApply: f });
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/lib/supabase-admin")
      return {
        url:
          "data:text/javascript," +
          encodeURIComponent(
            `const f=globalThis.__discordApply;export function getSupabaseAdmin(){return {from(t){f.reads.push(t);const q={select(){return q},eq(){return q},async maybeSingle(){return {data:f.row,error:null}}};return q},async rpc(name,args){f.rpcs.push({name,...args});return {data:{applied:{member_id:'${memberId}',game_id:'${gameId}',status:args.p_observations.length?'accepted':'applying',updated_at:'now'}},error:null}}}}`,
          ),
        shortCircuit: true,
      };
    return next(specifier, context);
  },
});
const service =
  await import("../src/features/game-membership/server/discord-game-membership.server");
hooks.deregister();
let fixture = 0;
async function run(body: () => Promise<void>) {
  const keys = [
      "DISCORD_GAME_MEMBERSHIP_ENABLED",
      "DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF",
      "VITE_SUPABASE_URL",
      "DISCORD_GUILD_ID",
      "DISCORD_BOT_TOKEN",
    ],
    old = keys.map((k) => process.env[k]),
    fetcher = globalThis.fetch;
  f.row = {
    discord_id: discordId,
    ign: "Character",
    members: { discord_id: discordId },
    games: { is_active: true, slug: "aion-2" },
  };
  f.reads = [];
  f.rpcs = [];
  f.network = 0;
  f.unavailable = false;
  Object.assign(process.env, {
    DISCORD_GAME_MEMBERSHIP_ENABLED: "true",
    DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF: "xjwugbbrqpwnenmlrkdh",
    VITE_SUPABASE_URL: "https://xjwugbbrqpwnenmlrkdh.supabase.co",
    DISCORD_GUILD_ID: DISCORD_GAME_GUILD_ID,
    DISCORD_BOT_TOKEN: `fixture-${++fixture}`,
  });
  globalThis.fetch = async (input) => {
    f.network++;
    return String(input).endsWith("/roles")
      ? Response.json(DISCORD_GAME_ROLE_MAPPINGS.map(({ roleId }) => ({ id: roleId })))
      : f.unavailable
        ? Response.json({ code: 50013 }, { status: 403 })
        : Response.json({
            user: { id: discordId },
            roles: DISCORD_GAME_ROLE_MAPPINGS.map((x) => x.roleId),
          });
  };
  try {
    await body();
  } finally {
    globalThis.fetch = fetcher;
    keys.forEach((key, i) => {
      if (old[i] === undefined) delete process.env[key];
      else process.env[key] = old[i];
    });
  }
}
test("Apply eligibility uses one indexed saved-profile join and one mutation RPC", () =>
  run(async () => {
    assert.equal((await service.applyDiscordGameMembership(memberId, gameId)).status, "accepted");
    assert.deepEqual(f.reads, ["member_game_profiles"]);
    assert.equal(f.rpcs.length, 1);
  }));
for (const bad of ["missing", "blank", "control", "inactive"]) {
  test(`ineligible ${bad} profile consumes no Discord calls and no membership writes`, () =>
    run(async () => {
      if (bad === "missing") f.row = null;
      else if (bad === "blank") f.row!.ign = " ";
      else if (bad === "control") f.row!.ign = "bad\nname";
      else f.row!.games = { is_active: false };
      await assert.rejects(service.applyDiscordGameMembership(memberId, gameId));
      assert.equal(f.network, 0);
      assert.equal(f.rpcs.length, 0);
    }));
}
test("Discord outage retains Applying without presenting outage as role absence", () =>
  run(async () => {
    f.unavailable = true;
    assert.equal((await service.applyDiscordGameMembership(memberId, gameId)).status, "applying");
    assert.deepEqual(f.rpcs[0].p_observations, []);
    assert.equal(f.rpcs.length, 1);
  }));
test("wrong project stops before any Supabase or Discord work", () =>
  run(async () => {
    process.env.VITE_SUPABASE_URL = "https://efchfvreaotskrdlweze.supabase.co";
    await assert.rejects(service.applyDiscordGameMembership(memberId, gameId), /target/);
    assert.equal(f.reads.length, 0);
    assert.equal(f.rpcs.length, 0);
    assert.equal(f.network, 0);
  }));
test("concurrent duplicate Apply calls share their owner read, proof and transaction", () =>
  run(async () => {
    const [a, b] = await Promise.all([
      service.applyDiscordGameMembership(memberId, gameId),
      service.applyDiscordGameMembership(memberId, gameId),
    ]);
    assert.deepEqual(a, b);
    assert.equal(f.reads.length, 1);
    assert.equal(f.rpcs.length, 1);
  }));
