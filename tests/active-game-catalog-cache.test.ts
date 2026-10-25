import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { QueryClient } from "@tanstack/react-query";
import { MEMBER_READ_QUERY_OPTIONS } from "../src/features/member/queries/member-query-options";

const fixture = {
  client: new QueryClient(),
  queries: [] as Record<string, unknown>[],
  mutation: null as { onSuccess: (...args: unknown[]) => unknown } | null,
};
Object.assign(globalThis, { __activeGameCache: fixture });
const hook = registerHooks({
  resolve(specifier, context, next) {
    let source: string | undefined;
    if (specifier === "@tanstack/react-query")
      source = `const f=globalThis.__activeGameCache;
        export function useQuery(options){f.queries.push(options);return {};}
        export function useMutation(options){f.mutation=options;return {};}
        export function useQueryClient(){return f.client;}`;
    if (specifier === "../services/games.service")
      source = `const read=async()=>[];export const getGames=read,getActiveGames=read,getGameById=read,getGameBySlug=read,getGamesWithRoles=read,getGameRoles=read;const write=async()=>({});export const createGame=write,updateGame=write,deleteGame=write,addGameRole=write,removeGameRole=write;`;
    return source
      ? { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true }
      : next(specifier, context);
  },
});
const hooks = await import("../src/features/admin/features/games/hooks/useGames");
hook.deregister();

test("user-facing active catalog uses normal member freshness rather than a 30-minute cache", () => {
  fixture.queries = [];
  hooks.useActiveGames();
  const options = fixture.queries[0];
  assert.equal(options.staleTime, MEMBER_READ_QUERY_OPTIONS.staleTime);
  assert.equal(options.refetchOnWindowFocus, true);
});

test("catalog mutations invalidate member workspaces without deleting saved records or history", async () => {
  const cases = [
    ["create", hooks.useCreateGame, [{}, {}]],
    ["update", hooks.useUpdateGame, [{}, { id: "game", input: { is_active: false } }]],
    ["delete", hooks.useDeleteGame, [undefined, "game"]],
    ["add role", hooks.useAddGameRole, [{}, { gameId: "game" }]],
    ["remove role", hooks.useRemoveGameRole, [undefined, { gameId: "game", roleId: "role" }]],
  ] as const;
  // React Query hooks are replaced above with pure option-capturing functions.
  for (const [name, captureOptions, args] of cases) {
    fixture.client.clear();
    const workspaceKey = ["my-game-workspace", "member"];
    const saved = { profiles: [{ gameId: "game", ign: "Saved character" }], memberships: [] };
    fixture.client.setQueryData(workspaceKey, saved);
    fixture.client.setQueryData(["member-championships", "member"], ["Historic title"]);
    captureOptions();
    assert.ok(fixture.mutation);
    await fixture.mutation.onSuccess(...args);
    assert.equal(fixture.client.getQueryState(workspaceKey)?.isInvalidated, true, name);
    assert.deepEqual(fixture.client.getQueryData(workspaceKey), saved);
    assert.equal(
      fixture.client.getQueryState(["member-championships", "member"])?.isInvalidated,
      false,
    );
  }
});
