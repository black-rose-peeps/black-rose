import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const gameId = "22222222-2222-4222-8222-222222222222";
const roleId = "33333333-3333-4333-8333-333333333333";
const fixture = {
  admin: false,
  sameOrigin: true,
  referenced: false,
  calls: [] as { transport: string; table: string; operation: string; value?: unknown }[],
  client(transport: string) {
    return {
      from(table: string) {
        let operation = "read";
        let value: unknown;
        const q = {
          select() {
            return q;
          },
          eq() {
            return q;
          },
          order() {
            return q;
          },
          limit() {
            return q;
          },
          insert(input: unknown) {
            operation = "insert";
            value = input;
            return q;
          },
          update(input: unknown) {
            operation = "update";
            value = input;
            return q;
          },
          delete() {
            operation = "delete";
            return q;
          },
          async execute(single: boolean) {
            fixture.calls.push({
              transport,
              table,
              operation,
              ...(value === undefined ? {} : { value }),
            });
            if (operation === "read")
              return {
                data: single ? null : fixture.referenced ? [{ id: "reference" }] : [],
                error: null,
              };
            return { data: single ? { id: gameId, ...(value as object) } : null, error: null };
          },
          single() {
            return q.execute(true);
          },
          maybeSingle() {
            return q.execute(true);
          },
          then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
            return q.execute(false).then(resolve, reject);
          },
        };
        return q;
      },
    };
  },
};
Object.assign(globalThis, { __gameCatalogSecurity: fixture });
const serverUrl = new URL(
  "../src/features/admin/features/games/server/games.server.ts",
  import.meta.url,
).href;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "@/lib/supabase")
      source =
        "export const getSupabaseClient=()=>globalThis.__gameCatalogSecurity.client('browser');";
    if (specifier === "@/lib/supabase-admin")
      source =
        "export const getSupabaseAdmin=()=>globalThis.__gameCatalogSecurity.client('server');";
    if (specifier === "@/features/auth/server/trusted-session.server")
      source = `
    export async function requireAdminSession(){if(!globalThis.__gameCatalogSecurity.admin)throw Error('Admin sign in required');return {adminId:'admin',username:'admin'};}
    export function assertTrustedOrigin(){if(!globalThis.__gameCatalogSecurity.sameOrigin)throw Error('Same origin required');}`;
    if (specifier === "../functions/games.functions")
      source = `import * as server from '${serverUrl}';
    export const createGameRequest=({data})=>server.createGame(data);
    export const updateGameRequest=({data})=>server.updateGame(data.id,data.input);
    export const deleteGameRequest=({data})=>server.deleteGame(data.id);
    export const addGameRoleRequest=({data})=>server.addGameRole(data.gameId,data.roleName);
    export const removeGameRoleRequest=({data})=>server.removeGameRole(data.roleId);`;
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const catalog = await import("../src/features/admin/features/games/services/games.service");
hooks.deregister();
const input = {
  name: "Fixture Game",
  slug: "fixture-game",
  display_name: "Fixture Game",
  sort_order: 1,
};
function reset() {
  fixture.admin = false;
  fixture.sameOrigin = true;
  fixture.referenced = false;
  fixture.calls = [];
}

test("catalog mutations refuse unauthenticated callers before any browser or server write", async () => {
  reset();
  await assert.rejects(catalog.createGame(input), /Admin/);
  await assert.rejects(catalog.updateGame(gameId, { display_name: "Changed" }), /Admin/);
  await assert.rejects(catalog.deleteGame(gameId), /Admin/);
  await assert.rejects(catalog.addGameRole(gameId, "Support"), /Admin/);
  await assert.rejects(catalog.removeGameRole(roleId), /Admin/);
  assert.deepEqual(fixture.calls, []);
});

test("a signed-in admin's cross-origin catalog write is refused before database access", async () => {
  reset();
  fixture.admin = true;
  fixture.sameOrigin = false;
  await assert.rejects(catalog.createGame(input), /origin/i);
  assert.deepEqual(fixture.calls, []);
});

test("existing create-game API persists validated per-game field configuration through the server", async () => {
  reset();
  fixture.admin = true;
  const config = {
    class: {
      enabled: true,
      label: "Class",
      kind: "select" as const,
      options: ["Cleric", "Ranger"],
    },
  };
  await catalog.createGame({ ...input, profile_field_config: config });
  assert.ok(fixture.calls.every((call) => call.transport === "server"));
  const insert = fixture.calls.find(
    (call) => call.table === "games" && call.operation === "insert",
  );
  assert.deepEqual((insert?.value as Record<string, unknown>)?.profile_field_config, config);
});

test("removing a referenced role retires it rather than deleting saved assignments", async () => {
  reset();
  fixture.admin = true;
  fixture.referenced = true;
  await catalog.removeGameRole(roleId);
  assert.ok(
    fixture.calls.some((call) => call.table === "game_roles" && call.operation === "update"),
  );
  assert.ok(!fixture.calls.some((call) => call.operation === "delete"));
});

test("a referenced game is preserved with a useful deactivate-instead error", async () => {
  reset();
  fixture.admin = true;
  fixture.referenced = true;
  await assert.rejects(catalog.deleteGame(gameId), /deactivat|referenc/i);
  assert.ok(!fixture.calls.some((call) => call.operation === "delete"));
});
