import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const fixture = {
  rows: [] as { id: string; roster_team_id: string | null; name: string; tag: string | null }[],
  error: null as { message: string } | null,
  calls: [] as { table: string; columns?: string; tournamentId?: string }[],
};
Object.assign(globalThis, { __championshipRegistrationReads: fixture });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase") {
      const source = `const f=globalThis.__championshipRegistrationReads;
        export const supabase={from(table){
          const call={table};f.calls.push(call);
          if(table!=='tournament_registrations')throw Error('Unexpected historical roster hydration');
          const q={
            select(columns){call.columns=columns;return q;},
            eq(column,value){if(column!=='tournament_id')throw Error('Unexpected filter');call.tournamentId=value;return q;},
            order:async()=>({data:f.rows,error:f.error}),
            update(){throw Error('Historical read attempted a write');}
          };return q;
        }};`;
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { fetchChampionshipRegistrations } =
  await import("../src/features/championships/services/championship-registration.service");
hooks.deregister();

function reset() {
  fixture.rows = [];
  fixture.error = null;
  fixture.calls = [];
}

test("championship lookup reads only historical registration identities in one query", async () => {
  reset();
  fixture.rows = [
    {
      id: "winner-registration",
      roster_team_id: "renamed-roster",
      name: "Historical Winners",
      tag: "OLD",
    },
    { id: "legacy-registration", roster_team_id: null, name: "Legacy entrant", tag: null },
  ];
  assert.deepEqual(await fetchChampionshipRegistrations("cup"), [
    {
      id: "winner-registration",
      rosterTeamId: "renamed-roster",
      name: "Historical Winners",
      tag: "OLD",
    },
    { id: "legacy-registration", rosterTeamId: undefined, name: "Legacy entrant", tag: "" },
  ]);
  assert.deepEqual(fixture.calls, [
    {
      table: "tournament_registrations",
      columns: "id, roster_team_id, name, tag",
      tournamentId: "cup",
    },
  ]);
});

test("empty championship registration history needs no fallback roster reads", async () => {
  reset();
  assert.deepEqual(await fetchChampionshipRegistrations("empty-cup"), []);
  assert.equal(fixture.calls.length, 1);
});

test("a failed historical identity query rejects and does not poison later reads", async () => {
  reset();
  fixture.error = { message: "History unavailable" };
  await assert.rejects(fetchChampionshipRegistrations("cup"), /History unavailable/);
  fixture.error = null;
  assert.deepEqual(await fetchChampionshipRegistrations("cup"), []);
  assert.equal(fixture.calls.length, 2);
});
