import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, test } from "node:test";
const f = { methods: [] as string[], args: [] as unknown[], signedIn: true };
Object.assign(globalThis, { __acceptanceTransport: f });
const hooks = registerHooks({
  resolve(specifier, context, next) {
    let source: string | undefined;
    if (specifier === "@tanstack/react-start")
      source = `export function createServerFn({method}){globalThis.__acceptanceTransport.methods.push(method);return{handler(fn){return options=>fn({data:options?.data})}}}`;
    if (specifier.endsWith("/server/game-membership-notifications.server"))
      source = `export async function fetchMyGameMembershipAcceptances(...args){const f=globalThis.__acceptanceTransport;f.args=args;if(!f.signedIn)throw Error('Sign in required');return{memberId:'signed-session-owner',events:[]}}`;
    return source
      ? { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true }
      : next(specifier, context);
  },
});
const transport =
  await import("../src/features/notifications/functions/game-membership-notifications.functions");
after(() => hooks.deregister());

test("approval transport uses POST and discards browser-supplied member or administrator claims", async () => {
  const result = await transport.fetchMyGameMembershipAcceptances({
    data: { memberId: "other-owner", role: "admin" },
  } as never);
  assert.deepEqual(f.methods, ["POST"]);
  assert.deepEqual(f.args, []);
  assert.deepEqual(result, { memberId: "signed-session-owner", events: [] });
});

test("approval transport propagates a missing trusted session", async () => {
  f.signedIn = false;
  await assert.rejects(transport.fetchMyGameMembershipAcceptances(), /Sign in/);
  f.signedIn = true;
});
