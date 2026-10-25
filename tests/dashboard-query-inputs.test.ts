import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import type { MockTournament } from "../src/lib/mock-data";
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/features/member/services/member-dashboard.service") {
      return {
        url: "data:text/javascript,export async function fetchMemberTournamentDashboard(){return {activeRegistrations:[],upcomingMatches:[],tournamentHistory:[]};}",
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/tournaments/hooks") {
      return {
        url: "data:text/javascript,export const TOURNAMENTS_QUERY_KEY=['tournaments'];",
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
const { memberTournamentDashboardQueryOptions } =
  await import("../src/features/member/queries/member-dashboard-queries");
hooks.deregister();

test("a loaded empty tournament list completes dashboard reads instead of leaving them disabled", () => {
  assert.equal(memberTournamentDashboardQueryOptions("member", []).enabled, true);
  assert.equal(memberTournamentDashboardQueryOptions("member", undefined).enabled, false);
  assert.equal(memberTournamentDashboardQueryOptions(undefined, []).enabled, false);
});

test("dashboard snapshots update when existing tournament display/status inputs change", () => {
  const fixture = {
    id: "tournament",
    name: "Fixture",
    game: "Palworld",
    status: "Live",
    startDate: "2026-10-18",
    registrationDeadline: "2026-10-17",
  } as MockTournament;
  const original = memberTournamentDashboardQueryOptions("member", [fixture]).queryKey;
  for (const change of [
    { status: "Completed" as const },
    { name: "Renamed fixture" },
    { startDate: "2026-10-19" },
  ]) {
    assert.notDeepEqual(
      memberTournamentDashboardQueryOptions("member", [{ ...fixture, ...change }]).queryKey,
      original,
    );
  }
  const second = { ...fixture, id: "second" };
  assert.deepEqual(
    memberTournamentDashboardQueryOptions("member", [fixture, second]).queryKey,
    memberTournamentDashboardQueryOptions("member", [second, fixture]).queryKey,
  );
});
