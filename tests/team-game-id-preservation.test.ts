import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import type { Team } from "../src/features/teams/types";

const stored = {
  id: "historic-team",
  name: "Existing team",
  tag: "OLD",
  game: "Palworld",
  game_id: "stored-game-id",
  captain_user_id: "captain",
  created_at: "2026-01-01",
  active_tournament_id: null,
};
const service = {} as {
  fetchTeams(): Promise<Team[]>;
  fetchTeamById(id: string): Promise<Team | null>;
};
const compiled = ts.transpileModule(
  readFileSync(
    new URL("../src/features/admin/features/teams/services/teams.service.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const supabase = {
  from(table: string) {
    const data = table === "teams" ? [stored] : [];
    const q = {
      select() {
        return q;
      },
      order() {
        return q;
      },
      eq() {
        return q;
      },
      in() {
        return q;
      },
      neq() {
        return q;
      },
      single: async () => ({ data: data[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: data[0] ?? null, error: null }),
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return q;
  },
};
new Function("require", "exports", compiled)(
  (id: string) =>
    id === "@/lib/supabase" ? { supabase } : new Proxy({}, { get: () => () => undefined }),
  service,
);

test("team list and detail readers preserve saved catalog ID without requiring an active game lookup", async () => {
  const original = structuredClone(stored);
  assert.equal((await service.fetchTeams())[0].gameId, stored.game_id);
  assert.equal((await service.fetchTeamById(stored.id))?.gameId, stored.game_id);
  assert.deepEqual(stored, original);
});
