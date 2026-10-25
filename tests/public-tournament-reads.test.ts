import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const fixture = {
  reconciliations: 0,
  writes: 0,
  row: {
    id: "fixture-tournament",
    name: "Read-only fixture",
    game: "Palworld",
    status: "Registration Open",
    prize_pool: "0",
    start_date: "2099-12-01",
    registration_deadline: "2099-11-30",
    teams_registered: 2,
    team_cap: 8,
    format: "Single Elimination",
    region: "SEA",
  },
};
Object.assign(globalThis, { __publicTournamentReads: fixture });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "@/lib/supabase") {
      source = `const f=globalThis.__publicTournamentReads;
        export const supabase={from(){const q={
          select(){return q},eq(){return q},
          order:async()=>({data:[f.row],error:null}),
          single:async()=>({data:f.row,error:null}),
          update(){f.writes++;throw Error('Read path attempted a write')}
        };return q;}};`;
    }
    if (specifier === "./tournament-registrations.service") {
      source = `export async function reconcileTournamentTeamCount(_id,count){globalThis.__publicTournamentReads.reconciliations++;return count;}
        export async function concludeTournamentRegistrations(){}
        export async function countBracketParticipantRegistrations(){return 0;}`;
    }
    if (specifier === "@/features/admin/features/tournament-details/services/bracket.service") {
      source =
        "export async function deleteTournamentChampion(){} export async function syncTournamentChampionArchive(){}";
    }
    if (specifier === "@/features/admin/services/audit-log.service") {
      source = "export const ADMIN_AUDIT_ACTIONS={};export async function logAdminAction(){}";
    }
    if (
      specifier ===
      "@/features/admin/features/tournaments/services/tournament-registrations.service"
    ) {
      source = "export async function fetchTournamentRegistrations(){return [];}";
    }
    if (specifier === "./team-registration.service") {
      const names = [
        "fetchCaptainTeams",
        "fetchCaptainRegistrationStatusForTournament",
        "fetchCaptainTournamentRegistrationMap",
        "fetchOpenTeamTournaments",
        "fetchRegistrationsForTeam",
        "fetchTeamTournamentRegistration",
        "requestCaptainTeamRegistration",
        "isPendingCaptainRegistrationStatus",
        "isRegisteredCaptainStatus",
        "pendingRegistrations",
        "approvedRegistration",
      ];
      source = names.map((name) => `export function ${name}(){}`).join("\n");
    }
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const service = await import("../src/features/tournaments/services");
hooks.deregister();

test("public tournament lists reuse a read-only snapshot without administrative reconciliation", async () => {
  fixture.reconciliations = 0;
  fixture.writes = 0;
  const rows = await service.fetchTournaments();
  assert.equal(rows[0].id, fixture.row.id);
  assert.equal(rows[0].teamsRegistered, 2);
  assert.equal(fixture.reconciliations, 0);
  assert.equal(fixture.writes, 0);
});

test("public tournament detail reads never reconcile registration counts", async () => {
  fixture.reconciliations = 0;
  fixture.writes = 0;
  const row = await service.fetchTournamentById(fixture.row.id);
  assert.equal(row?.id, fixture.row.id);
  assert.equal(fixture.reconciliations, 0);
  assert.equal(fixture.writes, 0);
});

test("expired public registration derives a closed status without persisting it", async () => {
  const deadline = fixture.row.registration_deadline;
  fixture.row.registration_deadline = "2000-01-01";
  fixture.reconciliations = 0;
  fixture.writes = 0;
  try {
    const row = await service.fetchTournamentById(fixture.row.id);
    assert.equal(row?.status, "Registration Closed");
    assert.equal(fixture.row.status, "Registration Open");
    assert.equal(fixture.reconciliations, 0);
    assert.equal(fixture.writes, 0);
  } finally {
    fixture.row.registration_deadline = deadline;
  }
});
