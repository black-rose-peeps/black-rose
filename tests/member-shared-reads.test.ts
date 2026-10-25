import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { setAppQueryClient } from "../src/lib/app-query";
import { queryKeys } from "../src/lib/query-keys";

const counts = { teams: 0, tournaments: 0, notifications: 0, registrations: 0 };
Object.assign(globalThis, { __sharedReadCounts: counts });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const sources: Record<string, string> = {
      "@/features/admin/features/teams/services/teams.service":
        "export async function fetchTeamsForUser(id){globalThis.__sharedReadCounts.teams++;return [{id:'team-'+id,members:[{userId:id,status:'active'}]}];}",
      "@/features/admin/features/tournaments/services/tournaments.service":
        "export async function fetchTournamentsLite(){globalThis.__sharedReadCounts.tournaments++;return [{id:'tournament',name:'Fixture',status:'Registration Open',game:'Palworld'}];}export async function fetchTournamentsForNotifications(){globalThis.__sharedReadCounts.notifications++;return [];}",
      "@/features/admin/features/tournaments/services/tournament-registrations.service":
        "export async function fetchRegistrationsForTeam(id){globalThis.__sharedReadCounts.registrations++;return [{id:'registration-'+id,tournamentId:'tournament'}];}",
      "@/features/tournaments/services/team-registration.service":
        "export async function fetchRegistrationsForTeam(id){globalThis.__sharedReadCounts.registrations++;return [{id:'registration-'+id,tournamentId:'tournament'}];}",
      "@/features/admin/features/tournament-details/services/bracket.service":
        "export async function fetchPublishedBracketPayload(){return null;}",
    };
    if (sources[specifier]) {
      return {
        url: `data:text/javascript,${encodeURIComponent(sources[specifier])}`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
const reads = await import("../src/features/member/queries/member-data-queries");
const dashboard = await import("../src/features/member/services/member-dashboard.service");
hooks.deregister();

function reset() {
  Object.assign(counts, { teams: 0, tournaments: 0, notifications: 0, registrations: 0 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  setAppQueryClient(client);
  return client;
}

test("sequential member reads reuse a fresh snapshot independently of client defaults", async () => {
  const client = reset();
  try {
    await reads.fetchMemberTeamsCached("member-a");
    await reads.fetchMemberTeamsCached("member-a");
    assert.equal(counts.teams, 1);
    await reads.fetchMemberTeamsCached("member-b");
    assert.equal(counts.teams, 2, "member scopes must remain separate");
  } finally {
    client.clear();
  }
});

test("dashboard reuses team and registration reads already loaded for notifications", async () => {
  const client = reset();
  try {
    await reads.loadMemberTournamentNotificationContext("member-a");
    const result = await dashboard.fetchMemberTournamentDashboard("member-a");
    assert.equal(counts.teams, 1);
    assert.equal(counts.registrations, 1);
    assert.equal(counts.tournaments, 1);
    assert.deepEqual(result, {
      activeRegistrations: [],
      upcomingMatches: [],
      tournamentHistory: [],
    });
  } finally {
    client.clear();
  }
});

test("public, member and notification reads share the same raw tournament snapshot", async () => {
  const client = reset();
  const snapshot = [{ id: "draft", name: "Draft fixture", status: "Draft", game: "Palworld" }];
  try {
    client.setQueryData(["tournaments"], snapshot);
    assert.deepEqual(await reads.fetchTournamentsLiteCached(), snapshot);
    assert.deepEqual(await reads.fetchTournamentsForNotificationsCached(), snapshot);
    assert.equal(counts.tournaments, 0);
    assert.equal(counts.notifications, 0);
    assert.deepEqual(client.getQueryData(["tournaments"]), snapshot);
  } finally {
    client.clear();
  }
});
