import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import type { MockTeam, MockTournament } from "../src/lib/mock-data";
import type { Team } from "../src/features/teams/types";
import type { PersistedBracketPayload } from "../src/features/admin/features/tournament-details/services/bracket.service";

const counts = {
  full: 0,
  lite: 0,
  teams: 0,
  registrations: 0,
  brackets: 0,
  tournamentRegistrations: 0,
};
let tournaments: MockTournament[] = [];
let teams: Team[] = [];
let registrations = new Map<string, MockTeam[]>();
let tournamentRegistrations: MockTeam[] = [];
let adminHydrations = 0;
let payload: PersistedBracketPayload | null = null;
let fail: "snapshot" | "registrations" | "bracket" | "tournamentRegistrations" | null = null;
const registrationOptions: { tournaments?: MockTournament[]; liveTeamsById?: Map<string, Team> }[] =
  [];
const io = {
  async full() {
    counts.full++;
    return tournaments;
  },
  async lite() {
    counts.lite++;
    if (fail === "snapshot") throw new Error("snapshot failed");
    return tournaments;
  },
  async teams() {
    counts.teams++;
    return teams;
  },
  async registrations(id: string, options?: (typeof registrationOptions)[number]) {
    counts.registrations++;
    if (options) registrationOptions.push(options);
    if (fail === "registrations") throw new Error("registrations failed");
    return registrations.get(id) ?? [];
  },
  async bracket() {
    counts.brackets++;
    if (fail === "bracket") throw new Error("bracket failed");
    return { payload };
  },
  async tournamentRegistrations(adminHydration = false) {
    if (adminHydration) adminHydrations++;
    counts.tournamentRegistrations++;
    if (fail === "tournamentRegistrations") throw new Error("tournamentRegistrations failed");
    return tournamentRegistrations;
  },
};
Object.assign(globalThis, { __championshipReadsIO: io });
const modules: Record<string, string> = {
  "bracket.service": "export const fetchBracketState = io.bracket;",
  "tournament-registrations.service":
    "export const fetchTournamentRegistrations = () => io.tournamentRegistrations(true);",
  "championship-registration.service":
    "export const fetchChampionshipRegistrations = () => io.tournamentRegistrations();",
  "tournaments.service": "export const fetchTournaments = io.full;",
  "teams.service": "export const fetchTeamsForUser = io.teams;",
  "team-registration.service": "export const fetchRegistrationsForTeam = io.registrations;",
  "member-data-queries":
    "export const fetchActiveMemberTeamsCached = io.teams; export const fetchMemberTeamsCached = io.teams; export const fetchTournamentsLiteCached = io.lite; export const fetchTeamRegistrationsCached = io.registrations;",
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const replacement = Object.entries(modules).find(([name]) => specifier.endsWith(name));
    if (replacement)
      return {
        url: `data:text/javascript,${encodeURIComponent(`const io = globalThis.__championshipReadsIO; ${replacement[1]}`)}`,
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
const service = await import("../src/features/championships/services/championship.service");
hooks.deregister();

function registration(id: string, name: string, rosterTeamId = id): MockTeam {
  return {
    id: `registration-${id}`,
    tournamentId: "cup",
    name,
    tag: "TAG",
    rosterTeamId,
    status: "Previously Competed",
  } as MockTeam;
}
function reset() {
  for (const key of Object.keys(counts) as (keyof typeof counts)[]) counts[key] = 0;
  tournaments = [
    {
      id: "cup",
      name: "Cup",
      status: "Archived",
      game: "Valorant",
      format: "Single Elimination",
      startDate: "2026-01-10",
    },
  ] as MockTournament[];
  teams = [];
  registrations = new Map([
    ["a", [registration("a", "Historical Winners", "roster")]],
    ["b", [registration("b", "Other Name", "roster")]],
    ["c", [registration("c", "Losers")]],
  ]);
  tournamentRegistrations = [registration("champion", "Winners", "roster")];
  payload = {
    placements: [{ rank: 1, label: "Champion", team: "Winners" }],
  } as PersistedBracketPayload;
  registrationOptions.length = 0;
  fail = null;
  adminHydrations = 0;
}
function title(teamId: string, teamName: string) {
  return {
    tournamentId: "cup",
    tournamentName: "Cup",
    game: "Valorant",
    teamId,
    teamName,
    teamTag: "TAG",
    concludedAt: "2026-01-10",
  };
}

test("multi-team operation shares lightweight snapshot, bracket and historical roster lookup", async () => {
  reset();
  const result = await service.fetchTeamsChampionshipMap(["a", "b", "c", "d"]);
  assert.deepEqual(
    [...result],
    [
      ["a", [title("a", "Historical Winners")]],
      ["b", [title("b", "Other Name")]],
    ],
  );
  assert.deepEqual(counts, {
    full: 0,
    lite: 1,
    teams: 0,
    registrations: 4,
    brackets: 1,
    tournamentRegistrations: 1,
  });
  assert.equal(registrationOptions.length, 4);
  assert.ok(registrationOptions.every((options) => options.tournaments === tournaments));
});

test("championship history never invokes administrative registration hydration", async () => {
  reset();
  const result = await service.fetchTeamsChampionshipMap(["a", "b"]);
  assert.equal(result.size, 2);
  assert.equal(adminHydrations, 0);
  assert.equal(counts.tournamentRegistrations, 1);
});

test("current roster aliases still match a champion stored after a team rename", async () => {
  reset();
  teams = [{ id: "roster", name: "Current Winners", tag: "NOW" }] as Team[];
  registrations.set("roster", [registration("old-reg", "Historical Winners", "roster")]);
  tournamentRegistrations = [registration("old-reg", "Historical Winners", "roster")];
  payload = {
    placements: [{ rank: 1, label: "Champion", team: "Current Winners" }],
  } as PersistedBracketPayload;
  assert.deepEqual(
    [...(await service.fetchTeamsChampionshipMap(["roster"], { teams }))],
    [["roster", [title("roster", "Historical Winners")]]],
  );
});

test("teams without registrations share one snapshot and never load results", async () => {
  reset();
  registrations.clear();
  assert.deepEqual([...(await service.fetchTeamsChampionshipMap(["a", "b", "c", "d"]))], []);
  assert.deepEqual(counts, {
    full: 0,
    lite: 1,
    teams: 0,
    registrations: 4,
    brackets: 0,
    tournamentRegistrations: 0,
  });
});

test("independent tournaments retain descending title order and distinct result loads", async () => {
  reset();
  tournaments.push({
    ...tournaments[0],
    id: "older-cup",
    name: "Older Cup",
    startDate: "2025-01-10",
  });
  registrations.set("a", [
    {
      ...registration("a", "Historical Winners", "roster"),
      tournamentId: "older-cup",
      status: "Approved",
    },
    registration("a", "Historical Winners", "roster"),
  ]);
  assert.deepEqual(await service.fetchTeamChampionships("a"), [
    title("a", "Historical Winners"),
    {
      ...title("a", "Historical Winners"),
      tournamentId: "older-cup",
      tournamentName: "Older Cup",
      concludedAt: "2025-01-10",
    },
  ]);
  assert.equal(counts.brackets, 2);
  assert.equal(counts.tournamentRegistrations, 2);
});

test("supplied snapshots reuse hydrated teams and duplicate IDs do not repeat reads", async () => {
  reset();
  teams = [{ id: "a" }, { id: "b" }] as Team[];
  const result = await service.fetchTeamsChampionshipMap(["a", "a", "b"], { teams, tournaments });
  assert.equal(result.size, 2);
  assert.equal(counts.lite, 0);
  assert.equal(counts.registrations, 2);
  assert.ok(registrationOptions.every((options) => options.liveTeamsById?.get("a") === teams[0]));
});

test("empty team and member operations perform no tournament or registration queries", async () => {
  reset();
  assert.deepEqual([...(await service.fetchTeamsChampionshipMap([]))], []);
  assert.deepEqual(counts, {
    full: 0,
    lite: 0,
    teams: 0,
    registrations: 0,
    brackets: 0,
    tournamentRegistrations: 0,
  });
  assert.deepEqual(await service.fetchMemberChampionships("member"), []);
  assert.equal(counts.teams, 1);
  assert.equal(counts.lite, 0);
  assert.equal(counts.registrations, 0);
});

test("member operation shares cached active teams and tournament context", async () => {
  reset();
  teams = [{ id: "a" }, { id: "b" }] as Team[];
  assert.deepEqual(await service.fetchMemberChampionships("member"), [
    title("a", "Historical Winners"),
    title("b", "Other Name"),
  ]);
  assert.deepEqual(counts, {
    full: 0,
    lite: 1,
    teams: 1,
    registrations: 2,
    brackets: 1,
    tournamentRegistrations: 1,
  });
  assert.ok(registrationOptions.every((options) => options.liveTeamsById?.get("b") === teams[1]));
});

for (const source of ["stored", "managed", "public", "match-fallback"] as const) {
  test(`${source} champion detection retains completed and archived results`, async () => {
    reset();
    const match = {
      id: "final",
      roundId: "final",
      roundLabel: "Final",
      label: "Final",
      teamA: "Winners",
      teamB: "Losers",
      winner: "Winners",
      confirmed: true,
      bracketSide: "upper",
      scoreA: 1,
      scoreB: 0,
      winnerNext: null,
      loserNext: null,
    };
    if (source === "managed")
      payload = { admin: { managedMatches: [match] } } as PersistedBracketPayload;
    if (source === "public")
      payload = { rounds: [{ label: "Final", matches: [match] }] } as PersistedBracketPayload;
    if (source === "match-fallback")
      payload = {
        admin: { managedMatches: [{ ...match, roundLabel: "Unknown" }] },
      } as PersistedBracketPayload;
    assert.deepEqual(await service.fetchTeamChampionships("a"), [title("a", "Historical Winners")]);
    tournaments[0].status = "Completed";
    assert.deepEqual(await service.fetchTeamChampionships("a"), [title("a", "Historical Winners")]);
    assert.equal(counts.brackets, 2, "each separate operation may refresh brackets");
  });
}

test("non-eligible registrations and ongoing tournaments never load brackets", async () => {
  reset();
  registrations.set("a", [{ ...registration("a", "Winners"), status: "Pending" }]);
  assert.deepEqual(await service.fetchTeamChampionships("a"), []);
  tournaments[0].status = "Live";
  assert.deepEqual(await service.fetchTeamChampionships("b"), []);
  assert.equal(counts.brackets, 0);
  assert.equal(counts.tournamentRegistrations, 0);
});

for (const failingRead of [
  "snapshot",
  "registrations",
  "bracket",
  "tournamentRegistrations",
] as const) {
  test(`${failingRead} failures retain rejection/fallback semantics without poisoning the next operation`, async () => {
    reset();
    fail = failingRead;
    if (failingRead === "snapshot" || failingRead === "registrations") {
      await assert.rejects(
        service.fetchTeamsChampionshipMap(["a", "b"]),
        new RegExp(`${failingRead} failed`),
      );
    } else {
      assert.deepEqual([...(await service.fetchTeamsChampionshipMap(["a", "b"]))], []);
      if (failingRead === "bracket") assert.equal(counts.brackets, 1);
      else assert.equal(counts.tournamentRegistrations, 1);
    }
    fail = null;
    assert.deepEqual(
      [...(await service.fetchTeamsChampionshipMap(["a", "b"]))],
      [
        ["a", [title("a", "Historical Winners")]],
        ["b", [title("b", "Other Name")]],
      ],
    );
  });
}

test("failed tournament roster lookup still allows a direct historical name/tag win", async () => {
  reset();
  registrations.set("a", [registration("a", "Winners")]);
  payload = {
    placements: [{ rank: 1, label: "Champion", team: "[TAG] Winners" }],
  } as PersistedBracketPayload;
  fail = "tournamentRegistrations";
  assert.deepEqual(await service.fetchTeamChampionships("a"), [title("a", "Winners")]);
});
