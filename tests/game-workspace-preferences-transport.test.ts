import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const fixture = { calls: [] as unknown[], methods: [] as string[] };
Object.assign(globalThis, { __preferenceTransport: fixture });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "@tanstack/react-start")
      source = `
      export function createServerFn({method}) {
        let validate=x=>x;
        const builder={validator(fn){validate=fn;return builder;},handler(fn){return async input=>{globalThis.__preferenceTransport.methods.push(method);return fn({data:validate(input?.data)});};}};
        return builder;
      }`;
    if (specifier === "../server/game-membership.server")
      source = `
      export async function changeMyMainGame(input){globalThis.__preferenceTransport.calls.push(input);}`;
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const service = await import("../src/features/game-membership/services/game-membership.service");
test("Main Game service forwards UUID or explicit null over POST and exposes a void result", async () => {
  try {
    assert.equal(typeof service.changeMyMainGame, "function");
    for (const gameId of ["22222222-2222-4222-8222-222222222222", null]) {
      assert.equal(await service.changeMyMainGame({ gameId }), undefined);
    }
    assert.deepEqual(fixture.calls, [
      { gameId: "22222222-2222-4222-8222-222222222222" },
      { gameId: null },
    ]);
    assert.deepEqual(fixture.methods, ["POST", "POST"]);
  } finally {
    hooks.deregister();
  }
});
