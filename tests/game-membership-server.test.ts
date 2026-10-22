import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
const memberId = "11111111-1111-4111-8111-111111111111";
const gameId = "22222222-2222-4222-8222-222222222222";
const f = {
  actor: "member" as "member" | "admin" | "none",
  clients: 0,
  rows: {} as Record<string, Record<string, unknown>[]>,
  calls: [] as { table: string; filters: [string, unknown][] }[],
  rpcs: [] as { name: string; args: Record<string, unknown> }[],
  response: {} as Record<string, unknown>,
  discordResponse: null as Record<string, unknown> | null,
  invalidations: 0,
  trustedOrigin: true,
  verified: true,
};
Object.assign(globalThis, { __gameMembershipServer: f });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "@/features/auth/server/trusted-session.server")
      source = `const f=globalThis.__gameMembershipServer;
    export async function requireMemberSession(){if(f.actor!=='member')throw Error('Sign in required');return {memberId:'${memberId}'};}
    export async function requireVerifiedMemberSession(){const session=await requireMemberSession();if(!f.verified)throw Error('Verification required');return session;}
    export async function requireAdminSession(){if(f.actor!=='admin')throw Error('Admin required');return {adminId:'${memberId}',username:'fixture-admin'};}
    export function assertTrustedOrigin(){if(!f.trustedOrigin)throw Error('Same origin required');}`;
    if (specifier === "@/features/member/server/profile.server")
      source = `export function invalidateMemberProfileCache(){globalThis.__gameMembershipServer.invalidations++;}`;
    if (specifier === "@/lib/supabase-admin")
      source = `const f=globalThis.__gameMembershipServer;
    export function getSupabaseAdmin(){f.clients++;return {
      from(table){const filters=[];f.calls.push({table,filters});let range;
        const data=()=>{let rows=(f.rows[table]||[]).filter(r=>filters.every(([key,val])=>Array.isArray(val)?val.includes(r[key]):r[key]===val));if(range)rows=rows.slice(range[0],range[0]+Math.min(2,range[1]-range[0]+1));return rows;};
        const q={select(){return q;},eq(key,val){filters.push([key,val]);return q;},in(key,val){filters.push([key,val]);return q;},order(){return q;},range(a,b){range=[a,b];return q;},maybeSingle:async()=>({data:data()[0]||null,error:null}),then(resolve,reject){return Promise.resolve({data:data(),error:null}).then(resolve,reject);}};return q;
      },rpc:async(name,args)=>{f.rpcs.push({name,args});return {data:name==='reconcile_discord_game_memberships'?{applied:f.discordResponse??f.response}:f.response,error:null};}
    };}`;
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const service = await import("../src/features/game-membership/server/game-membership.server");
hooks.deregister();
function reset() {
  f.actor = "member";
  f.clients = 0;
  f.calls = [];
  f.rpcs = [];
  f.invalidations = 0;
  f.discordResponse = null;
  f.trustedOrigin = true;
  f.verified = true;
  f.rows = {
    games: [
      {
        id: gameId,
        name: "Aion 2",
        display_name: "Aion 2",
        slug: "aion-2",
        is_active: true,
        game_roles: [],
        profile_field_config: {},
      },
    ],
    member_profiles: [
      {
        member_id: memberId,
        main_game: "Valorant",
        main_role: "Flex",
        game_identities: {},
        valorant_game_name: "Rose",
        valorant_tagline: "SEA",
        ingame_display_name: "",
      },
    ],
    member_game_profiles: [
      {
        member_id: memberId,
        game_id: gameId,
        ign: "Daeva",
        role_id: null,
        role_label: "",
        class_name: "",
        server_name: "",
        faction: "",
        updated_at: "2026-01-01",
      },
    ],
    game_memberships: [],
    members: [
      {
        id: memberId,
        username: "fixture",
        discord_username: "fixture.discord",
        status: "Verified",
        member_profiles: { display_name: "Fixture", main_game: "Valorant" },
      },
    ],
  };
  f.response = { ...f.rows.member_game_profiles[0] };
}
test("unauthenticated and non-admin requests are refused before database access", async () => {
  reset();
  f.actor = "none";
  await assert.rejects(service.fetchMyGameWorkspace(), /Sign in/);
  await assert.rejects(
    service.saveMyGameProfile({
      gameId,
      ign: "Daeva",
      roleId: null,
      className: "",
      serverName: "",
      faction: "",
    }),
    /Sign in/,
  );
  f.actor = "member";
  await assert.rejects(service.fetchGameRoster({ gameId }), /Admin/);
  await assert.rejects(
    service.changeGameMembershipAsAdmin({ memberId, gameId, status: "accepted" }),
    /Admin/,
  );
  assert.equal(f.clients, 0);
});
test("unverified and verification-revoked members cannot mutate game profiles or memberships", async () => {
  for (const status of ["Not Verified", "verification revoked"]) {
    reset();
    f.verified = false;
    await assert.rejects(
      service.saveMyGameProfile({
        gameId,
        ign: "Daeva",
        roleId: null,
        className: "",
        serverName: "",
        faction: "",
      }),
      /Verification/,
      status,
    );
    await assert.rejects(
      service.changeMyGameMembership({ gameId, action: "apply" }),
      /Verification/,
      status,
    );
    assert.equal(f.clients, 0);
    assert.equal(f.rpcs.length, 0);
    await service.fetchMyGameWorkspace();
  }
});
test("workspace is owner-scoped and does not infer membership from a saved IGN or Main Game", async () => {
  reset();
  f.rows.member_game_profiles.push({
    ...f.rows.member_game_profiles[0],
    member_id: "other-member",
  });
  const result = await service.fetchMyGameWorkspace();
  assert.equal(result.profiles.length, 1);
  assert.equal(result.profiles[0].memberId, memberId);
  assert.deepEqual(result.memberships, []);
  assert.equal(result.legacy.mainGame, "Valorant");
  assert.ok(!f.calls.some((call) => call.table === "game_membership_events"));
});
test("profile writes derive ownership from the trusted session and use the atomic compatibility RPC", async () => {
  reset();
  await service.saveMyGameProfile({
    gameId,
    ign: "Daeva",
    roleId: null,
    className: "",
    serverName: "",
    faction: "",
  });
  assert.equal(f.rpcs.length, 1);
  assert.equal(f.rpcs[0].name, "save_member_game_profile");
  assert.equal(f.rpcs[0].args.p_member_id, memberId);
  assert.equal(f.rpcs[0].args.p_game_id, gameId);
  assert.equal(f.invalidations, 1);
});
test("member application uses the saved profile and never forwards an admin status", async () => {
  reset();
  f.rows.member_game_profiles = [];
  await assert.rejects(service.changeMyGameMembership({ gameId, action: "apply" }), /IGN/);
  assert.equal(f.rpcs.length, 0);
  reset();
  f.response = {
    member_id: memberId,
    game_id: gameId,
    status: "applying",
    updated_at: "2026-01-01",
  };
  const result = await service.changeMyGameMembership({ gameId, action: "apply" });
  assert.equal(result.status, "applying");
  assert.equal(f.rpcs[0].args.p_actor_type, "member");
  assert.equal(f.rpcs[0].args.p_admin_status, null);
});
test("admin roster traverses API row caps and keeps Main Game separate from membership", async () => {
  reset();
  f.actor = "admin";
  const second = "33333333-3333-4333-8333-333333333333";
  const third = "44444444-4444-4444-8444-444444444444";
  for (const id of [second, third]) {
    f.rows.member_game_profiles.push({ ...f.rows.member_game_profiles[0], member_id: id });
    f.rows.members.push({ ...f.rows.members[0], id });
  }
  f.rows.game_memberships = [
    { member_id: memberId, game_id: gameId, status: "accepted", updated_at: "2026-01-01" },
  ];
  const all = await service.fetchGameRoster({ gameId });
  assert.equal(all.length, 3);
  const accepted = await service.fetchGameRoster({ gameId, status: "accepted" });
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].mainGame, "Valorant");
  assert.equal(accepted[0].membership?.status, "accepted");
});
test("mutations refuse untrusted origins before database access", async () => {
  reset();
  f.trustedOrigin = false;
  await assert.rejects(
    service.saveMyGameProfile({
      gameId,
      ign: "Daeva",
      roleId: null,
      className: "",
      serverName: "",
      faction: "",
    }),
    /origin/i,
  );
  await assert.rejects(service.changeMyGameMembership({ gameId, action: "apply" }), /origin/i);
  f.actor = "admin";
  await assert.rejects(
    service.changeGameMembershipAsAdmin({ memberId, gameId, status: "accepted" }),
    /origin/i,
  );
  assert.equal(f.clients, 0);
});
test("admin acceptance uses the stable authenticated admin UUID, never the username", async () => {
  reset();
  f.actor = "admin";
  f.response = {
    member_id: memberId,
    game_id: gameId,
    status: "accepted",
    updated_at: "2026-01-01",
  };
  await service.changeGameMembershipAsAdmin({ memberId, gameId, status: "accepted" });
  assert.equal(f.rpcs[0].args.p_actor_id, memberId);
  assert.notEqual(f.rpcs[0].args.p_actor_id, "fixture-admin");
});

test("enabled Apply uses a trusted Discord proof and one atomic RPC instead of preloading each game/profile table", async () => {
  reset();
  const keys = [
    "DISCORD_GAME_MEMBERSHIP_ENABLED",
    "DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF",
    "VITE_SUPABASE_URL",
    "DISCORD_GUILD_ID",
    "DISCORD_BOT_TOKEN",
  ];
  const before = keys.map((key) => process.env[key]);
  const originalFetch = globalThis.fetch;
  try {
    Object.assign(process.env, {
      DISCORD_GAME_MEMBERSHIP_ENABLED: "true",
      DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF: "xjwugbbrqpwnenmlrkdh",
      VITE_SUPABASE_URL: "https://xjwugbbrqpwnenmlrkdh.supabase.co",
      DISCORD_GUILD_ID: "1193921905795792906",
      DISCORD_BOT_TOKEN: "fixture-token",
    });
    const roles = [
      "1548977405069234256",
      "1547101455125577789",
      "1465129387182522450",
      "1475345886434295898",
      "1465128743726219287",
      "1331615176784482306",
      "1439483814182129695",
    ];
    const discordId = "111111111111111111";
    f.rows.members[0].discord_id = discordId;
    f.rows.member_game_profiles[0].members = { discord_id: discordId };
    f.rows.member_game_profiles[0].games = { is_active: true };
    globalThis.fetch = async (input) =>
      Response.json(
        String(input).endsWith("/roles")
          ? roles.map((id) => ({ id }))
          : { user: { id: discordId }, roles },
      );
    f.response = {
      member_id: memberId,
      game_id: gameId,
      status: "applying",
      updated_at: "2026-01-01",
    };
    f.discordResponse = { ...f.response, status: "accepted" };
    const saved = await service.changeMyGameMembership({ gameId, action: "apply" });
    assert.equal(saved.status, "accepted");
    assert.equal(f.rpcs.length, 1);
    assert.equal(f.rpcs[0].name, "reconcile_discord_game_memberships");
    assert.equal(f.rpcs[0].args.p_apply_member_id, memberId);
    assert.equal(f.rpcs[0].args.p_apply_game_id, gameId);
    assert.deepEqual(
      f.calls.map((call) => call.table),
      ["member_game_profiles"],
    );
  } finally {
    keys.forEach((key, index) => {
      if (before[index] === undefined) delete process.env[key];
      else process.env[key] = before[index];
    });
    globalThis.fetch = originalFetch;
  }
});
