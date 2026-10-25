import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const memberId = "11111111-1111-4111-8111-111111111111";
const gameId = "22222222-2222-4222-8222-222222222222";
const f = {
  verified: true,
  signedIn: true,
  origin: true,
  clients: 0,
  game: { id: gameId, is_active: true, game_roles: [] } as Record<string, unknown> | null,
  error: null as { message: string } | null,
  rpcs: [] as { name: string; args: Record<string, unknown> }[],
  invalidated: [] as string[],
};
Object.assign(globalThis, { __workspacePreferences: f });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "@/features/auth/server/trusted-session.server")
      source = `
      const f=globalThis.__workspacePreferences;
      export function assertTrustedOrigin(){if(!f.origin)throw Error('Untrusted origin');}
      export async function requireMemberSession(){throw Error('Use verified session');}
      export async function requireVerifiedMemberSession(){if(!f.signedIn)throw Error('Sign in required');if(!f.verified)throw Error('Verification required');return {memberId:'${memberId}'};}
      export async function requireAdminSession(){throw Error('Admin required');}`;
    if (specifier === "@/features/member/server/profile.server")
      source = `export function invalidateMemberProfileCache(id){globalThis.__workspacePreferences.invalidated.push(id);}`;
    if (specifier === "@/lib/supabase-admin")
      source = `
      const f=globalThis.__workspacePreferences;
      export function getSupabaseAdmin(){f.clients++;return {
        from(table){if(table!=='games')throw Error('Unexpected read: '+table);const q={select(){return q;},eq(key,value){if(key!=='id'||value!=='${gameId}')throw Error('Invalid catalog lookup');return q;},async maybeSingle(){return {data:f.game,error:null};}};return q;},
        async rpc(name,args){f.rpcs.push({name,args});return {data:null,error:f.error};}
      };}`;
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const server = await import("../src/features/game-membership/server/game-membership.server");
hooks.deregister();
function reset() {
  f.verified = true;
  f.signedIn = true;
  f.origin = true;
  f.clients = 0;
  f.game = { id: gameId, is_active: true, game_roles: [] };
  f.error = null;
  f.rpcs = [];
  f.invalidated = [];
}

test("Main Game writes only the catalog UUID and verified owner through the narrow RPC", async () => {
  reset();
  assert.equal(typeof server.changeMyMainGame, "function");
  assert.equal(await server.changeMyMainGame({ gameId }), undefined);
  assert.deepEqual(f.rpcs, [
    { name: "set_member_main_game", args: { p_member_id: memberId, p_game_id: gameId } },
  ]);
  assert.deepEqual(f.invalidated, [memberId]);
});

test("Main Game requires same origin and a current verified member before any database access", async () => {
  for (const state of ["origin", "signedIn", "verified"] as const) {
    reset();
    f[state] = false;
    await assert.rejects(server.changeMyMainGame({ gameId }), /origin|Sign in|Verification/i);
    assert.equal(f.clients, 0);
  }
});
test("Main Game rejects malformed IDs and caller-supplied ownership or stale profile fields", async () => {
  for (const value of [
    null,
    {},
    { gameId: undefined },
    { gameId: "Aion 2" },
    { gameId: "" },
    { gameId: ` ${gameId}` },
    { gameId, memberId },
    { gameId, displayName: "stale" },
  ]) {
    reset();
    await assert.rejects(server.changeMyMainGame(value as never), /Invalid|Unexpected/);
    assert.equal(f.clients, 0);
  }
});
test("Main Game rejects unavailable or inactive catalog games without writing", async () => {
  for (const game of [null, { id: gameId, is_active: false, game_roles: [] }]) {
    reset();
    f.game = game;
    await assert.rejects(server.changeMyMainGame({ gameId }), /not found|inactive/i);
    assert.deepEqual(f.rpcs, []);
    assert.deepEqual(f.invalidated, []);
  }
});
test("explicit null clears Main Game without a catalog read", async () => {
  reset();
  assert.equal(await server.changeMyMainGame({ gameId: null }), undefined);
  assert.equal(f.clients, 1);
  assert.deepEqual(f.rpcs[0], {
    name: "set_member_main_game",
    args: { p_member_id: memberId, p_game_id: null },
  });
  assert.deepEqual(f.invalidated, [memberId]);
});
test("failed Main Game RPC propagates its error and does not invalidate successful-read cache", async () => {
  reset();
  f.error = { message: "Catalog became inactive" };
  await assert.rejects(server.changeMyMainGame({ gameId }), /Catalog became inactive/);
  assert.deepEqual(f.invalidated, []);
});
