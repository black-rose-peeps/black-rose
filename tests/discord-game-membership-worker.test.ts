import worker from "../workers/discord-sync/src/index.ts";
import { syncRoseRoles } from "../workers/discord-sync/src/sync.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { syncMemberByDiscordId } from "../workers/discord-sync/src/sync-member.ts";
import { fetchGuildMemberRoleIds } from "../workers/discord-sync/src/discord.ts";
import {
  syncGameMemberships,
  SubrequestBudget,
} from "../workers/discord-sync/src/game-membership.ts";
import {
  DISCORD_GAME_ROLE_MAPPINGS,
  type DiscordRoleObservation,
} from "../src/features/game-membership/discord-role-proof.ts";

const env = {
  DISCORD_BOT_TOKEN: "fixture-token",
  DISCORD_GUILD_ID: "1193921905795792906",
  DISCORD_ROSE_ROLE_ID: "1465647773658517660",
  SUPABASE_URL: "https://efchfvreaotskrdlweze.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-service",
  DISCORD_GAME_MEMBERSHIP_ENABLED: "true",
  DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF: "xjwugbbrqpwnenmlrkdh",
};

test("budgeted Supabase requests reject redirects instead of hiding extra subrequests", async () => {
  const original = globalThis.fetch;
  const budget = new SubrequestBudget();
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.redirect, "error");
    return Response.json({});
  };
  try {
    await budget.fetch()("https://xjwugbbrqpwnenmlrkdh.supabase.co/rest/v1/fixture");
    assert.equal(budget.used, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("budgeted legacy ROSE requests also reject uncounted redirect hops", async () => {
  const original = globalThis.fetch;
  const budget = new SubrequestBudget();
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.redirect, "error");
    return Response.json({ roles: [] });
  };
  try {
    await fetchGuildMemberRoleIds(
      "fixture-token",
      "1193921905795792906",
      "123456789012345678",
      () => budget.take(),
    );
    assert.equal(budget.used, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("enabled member sync rejects wrong target before any network or writes", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("NETWORK MUST NOT RUN");
  };
  try {
    await assert.rejects(
      syncMemberByDiscordId(env, "123456789012345678"),
      /target|project|Supabase/i,
    );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("game phase uses one bounded eligibility RPC, validated fresh proofs and one dry-run batch", async () => {
  const original = globalThis.fetch;
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url, body });
    if (url.includes("get_discord_game_membership_sync_batch"))
      return Response.json({
        members: Array.from({ length: 12 }, (_, i) => ({
          member_id: `m${i}`,
          discord_id: `12345678901234567${i}`,
        })),
        total: 12,
        page: 0,
      });
    if (url.endsWith("/roles"))
      return Response.json(
        DISCORD_GAME_ROLE_MAPPINGS.map((r) => ({ id: r.roleId, name: r.label })),
      );
    if (url.includes("/members/"))
      return Response.json({
        user: { id: url.split("/").pop() },
        roles: [DISCORD_GAME_ROLE_MAPPINGS[0].roleId],
      });
    if (url.includes("reconcile_discord_game_memberships"))
      return Response.json({ changed: 8, accepted: 8, inactivated: 0, skipped: 0, changes: [] });
    throw new Error(`Unexpected fixture request ${url}`);
  };
  try {
    const budget = new SubrequestBudget();
    budget.used = 36; // ROSE cannot consume the reserved 12 requests.
    const result = await syncGameMemberships(
      { ...env, SUPABASE_URL: "https://xjwugbbrqpwnenmlrkdh.supabase.co" },
      { budget },
    );
    assert.equal(calls.length, 12);
    assert.equal(budget.used, 48);
    assert.equal(result.subrequestsUsed, 12);
    assert.equal(result.checked, 8);
    assert.equal(calls[0].body.p_limit, 8);
    const write = calls.at(-1)!.body;
    assert.equal(write.p_dry_run, true);
    assert.ok(Array.isArray(write.p_observations));
    assert.equal(write.p_observations.length, 8);
    assert.equal(write.p_apply_member_id, null);
    assert.equal(write.p_apply_game_id, null);
    assert.ok(!("observations" in result));
  } finally {
    globalThis.fetch = original;
  }
});

const devEnv = {
  ...env,
  SUPABASE_URL: "https://xjwugbbrqpwnenmlrkdh.supabase.co",
  SYNC_SECRET: "fixture-secret",
};

test("only Discord Unknown Member 404 yields a not-in-guild observation", async () => {
  const original = globalThis.fetch;
  let submitted: DiscordRoleObservation[] = [];
  const budget = new SubrequestBudget();
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("get_discord_game_membership_sync_batch"))
      return Response.json({
        members: [{ member_id: "fixture", discord_id: "123456789012345678" }],
        total: 1,
        page: 0,
      });
    if (url.endsWith("/roles"))
      return Response.json(DISCORD_GAME_ROLE_MAPPINGS.map((r) => ({ id: r.roleId })));
    if (url.includes("/members/")) return Response.json({ code: 10007 }, { status: 404 });
    submitted = JSON.parse(String(init?.body)).p_observations;
    return Response.json({ changed: 1, inactivated: 1 });
  };
  try {
    const result = await syncGameMemberships(devEnv, { budget, dryRun: false });
    assert.equal(result.inactivated, 1);
    assert.equal(budget.used, 5);
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0].not_in_guild, true);
    assert.deepEqual(submitted[0].role_ids, []);
  } finally {
    globalThis.fetch = original;
  }
});

for (const failure of [
  "429",
  "500",
  "malformed",
  "wrong-user",
  "404-unknown",
  "network",
  "missing-role",
  "deleted-before-write",
  "write-error",
] as const) {
  test(`game proof ${failure} fails closed and charges every attempted fetch`, async () => {
    const original = globalThis.fetch;
    const budget = new SubrequestBudget();
    budget.used = 36;
    let calls = 0;
    let roleCalls = 0;
    let writes = 0;
    globalThis.fetch = async (input) => {
      calls++;
      const url = String(input);
      if (url.includes("get_discord_game_membership_sync_batch"))
        return Response.json({
          members: [{ member_id: "fixture", discord_id: "123456789012345678" }],
          total: 1,
          page: 0,
        });
      if (url.endsWith("/roles")) {
        roleCalls++;
        const roles = DISCORD_GAME_ROLE_MAPPINGS.map((r) => ({ id: r.roleId }));
        return Response.json(
          failure === "missing-role" || (failure === "deleted-before-write" && roleCalls === 2)
            ? roles.slice(1)
            : roles,
        );
      }
      if (url.includes("reconcile_discord_game_memberships")) {
        writes++;
        return Response.json(
          { message: "fixture rejected write", code: "fixture" },
          { status: 400 },
        );
      }
      if (failure === "429") return Response.json({ retry_after: 0.1 }, { status: 429 });
      if (failure === "500") return Response.json({ message: "failure" }, { status: 500 });
      if (failure === "network") throw new Error("fixture network failure");
      if (failure === "404-unknown") return Response.json({ code: 10004 }, { status: 404 });
      if (failure === "malformed") return Response.json({ user: { id: "123456789012345678" } });
      if (failure === "wrong-user")
        return Response.json({ user: { id: "999456789012345678" }, roles: [] });
      return Response.json({ user: { id: "123456789012345678" }, roles: [] });
    };
    try {
      if (failure === "deleted-before-write" || failure === "write-error")
        await assert.rejects(syncGameMemberships(devEnv, { budget, dryRun: false }));
      else {
        const result = await syncGameMemberships(devEnv, { budget, dryRun: false });
        assert.equal(result.errors, 1);
        assert.equal(result.checked, 0);
      }
      assert.equal(writes, failure === "write-error" ? 1 : 0);
      assert.equal(budget.used, 36 + calls);
      assert.ok(budget.used <= 48);
      if (failure === "429") assert.equal(calls, 3);
    } finally {
      globalThis.fetch = original;
    }
  });
}

const ctx = { waitUntil: (_promise: Promise<unknown>) => {} } as Parameters<typeof worker.fetch>[2];

for (const roseCase of [
  "success",
  "429",
  "500",
  "write-error",
  "resolve-roles",
  "disabled",
] as const) {
  test(`ROSE ${roseCase} counts actual requests and reserves the bounded game phase`, async () => {
    const original = globalThis.fetch;
    let requests = 0;
    let writes = 0;
    globalThis.fetch = async (input, init) => {
      requests++;
      const url = String(input);
      if (init?.method === "HEAD")
        return new Response(null, {
          headers: {
            "content-range":
              url.includes("Not+Verified") && url.includes("gte.") ? "0-0/100" : "*/0",
          },
        });
      if (init?.method === "PATCH") {
        writes++;
        return roseCase === "write-error"
          ? Response.json({ message: "fixture write error" }, { status: 400 })
          : new Response(null, { status: 204 });
      }
      if (url.includes("get_discord_game_membership_sync_batch"))
        return Response.json({
          members: Array.from({ length: 8 }, (_, i) => ({
            member_id: `g${i}`,
            discord_id: `22345678901234567${i}`,
          })),
          total: 8,
          page: 0,
        });
      if (url.includes("reconcile_discord_game_memberships"))
        return Response.json({ changed: 8, accepted: 8 });
      if (url.endsWith("/roles"))
        return Response.json([
          ...DISCORD_GAME_ROLE_MAPPINGS.map((r) => ({ id: r.roleId, name: r.label })),
          { id: env.DISCORD_ROSE_ROLE_ID, name: "ROSE" },
        ]);
      if (url.includes("discord.com") && url.includes("/members/123")) {
        if (roseCase === "429") return Response.json({ retry_after: 0 }, { status: 429 });
        if (roseCase === "500") return Response.json({ message: "fixture error" }, { status: 500 });
      }
      if (url.includes("discord.com") && url.includes("/members/"))
        return Response.json({
          user: { id: url.split("/").pop() },
          roles: ["1465647773658517660", DISCORD_GAME_ROLE_MAPPINGS[0].roleId],
        });
      if (url.includes("/rest/v1/members"))
        return Response.json(
          Array.from({ length: 22 }, (_, i) => ({
            id: `m${i}`,
            discord_id: `1234567890123456${String(i).padStart(2, "0")}`,
            status: "Not Verified",
            discord_not_in_guild_strikes: 0,
            discord_sync_paused_at: null,
          })),
        );
      throw new Error(`Unexpected request ${url}`);
    };
    try {
      const result = await syncRoseRoles({
        ...devEnv,
        DISCORD_GAME_MEMBERSHIP_ENABLED: roseCase === "disabled" ? "false" : "true",
        DISCORD_ROSE_ROLE_ID: roseCase === "resolve-roles" ? undefined : env.DISCORD_ROSE_ROLE_ID,
      });
      if (roseCase === "429" || roseCase === "500") assert.equal(writes, 0);
      else assert.ok(writes > 0);
      if (roseCase === "disabled") assert.equal(result.gameMemberships, undefined);
      else {
        assert.equal(result.gameMemberships?.checked, 8);
        assert.equal(result.gameMemberships?.dryRun, false);
      }
      assert.ok(requests <= 48, `sent ${requests} requests`);
      assert.equal(result.subrequestsUsed, requests);
    } finally {
      globalThis.fetch = original;
    }
  });
}
test("enabled budget preserves reserved ROSE removal checks under a full hot queue", async () => {
  const original = globalThis.fetch;
  const checkedVerified = new Set<string>();
  let requests = 0;
  globalThis.fetch = async (input, init) => {
    requests++;
    const url = new URL(String(input));
    const verified = url.searchParams.get("status") === "eq.Verified";
    if (init?.method === "HEAD") {
      const count = verified ? 4 : url.searchParams.get("created_at")?.startsWith("gte.") ? 100 : 0;
      return new Response(null, { headers: { "content-range": `*/${count}` } });
    }
    if (init?.method === "PATCH") return new Response(null, { status: 204 });
    if (url.pathname.endsWith("get_discord_game_membership_sync_batch"))
      return Response.json({ members: [], total: 0, page: 0 });
    if (url.hostname === "discord.com") {
      const id = url.pathname.split("/").at(-1)!;
      if (id.startsWith("2")) checkedVerified.add(id);
      return Response.json({
        user: { id },
        roles: id.startsWith("2") ? [] : [env.DISCORD_ROSE_ROLE_ID],
      });
    }
    if (url.pathname.endsWith("/members"))
      return Response.json(
        Array.from({ length: verified ? 4 : 18 }, (_, i) => ({
          id: `${verified ? "v" : "n"}${i}`,
          discord_id: verified
            ? `22345678901234567${i}`
            : `1234567890123456${String(i).padStart(2, "0")}`,
          status: verified ? "Verified" : "Not Verified",
          discord_not_in_guild_strikes: 0,
          discord_sync_paused_at: null,
        })),
      );
    throw new Error("Unexpected fixture request");
  };
  try {
    const result = await syncRoseRoles(devEnv);
    assert.equal(checkedVerified.size, 4);
    assert.equal(result.unverified, 4);
    assert.equal(result.subrequestsUsed, requests);
    assert.ok(requests <= 48);
  } finally {
    globalThis.fetch = original;
  }
});

test("enabled Worker guards wrong target before ROSE, member, boost and scheduled writes", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({});
  };
  try {
    await assert.rejects(syncRoseRoles(env), /project|target|Supabase/i);
    for (const path of ["/sync", "/sync/member", "/sync/boost", "/sync/game-memberships"]) {
      const response = await worker.fetch(
        new Request(`https://fixture${path}`, {
          method: "POST",
          headers: { authorization: "Bearer fixture-secret" },
          body: JSON.stringify(path.endsWith("/member") ? { discordId: "123456789012345678" } : {}),
        }),
        { ...env, SYNC_SECRET: "fixture-secret" },
        ctx,
      );
      assert.equal(response.status, 503, path);
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("manual game API refuses caller identities, proofs, malformed flags and missing auth secrets", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("must not fetch");
  };
  try {
    for (const body of [
      { discordId: "123456789012345678" },
      { p_observations: [] },
      { dryRun: "false" },
      [],
      null,
    ]) {
      const response = await worker.fetch(
        new Request("https://fixture/sync/game-memberships", {
          method: "POST",
          headers: { authorization: "Bearer fixture-secret" },
          body: JSON.stringify(body),
        }),
        devEnv,
        ctx,
      );
      assert.equal(response.status, 400);
    }
    const unauthorized = await worker.fetch(
      new Request("https://fixture/sync/game-memberships", {
        method: "POST",
        headers: { authorization: "Bearer fixture-secret" },
      }),
      { ...devEnv, SYNC_SECRET: undefined },
      ctx,
    );
    assert.equal(unauthorized.status, 401);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("game phase is disabled without an exact true flag and never fetches", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("must not fetch");
  };
  try {
    for (const flag of [undefined, "false", "TRUE", "1", " true "]) {
      const result = await syncGameMemberships({ ...env, DISCORD_GAME_MEMBERSHIP_ENABLED: flag });
      assert.equal(result.enabled, false);
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("manual game sync is authenticated and defaults to dry-run without accepting caller proofs", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ members: [], total: 0, page: 0 });
  };
  try {
    const unauthorized = await worker.fetch(
      new Request("https://fixture/sync/game-memberships", { method: "POST" }),
      devEnv,
      ctx,
    );
    assert.equal(unauthorized.status, 401);
    assert.equal(calls, 0);
    const authorized = await worker.fetch(
      new Request("https://fixture/sync/game-memberships", {
        method: "POST",
        headers: { authorization: "Bearer fixture-secret" },
      }),
      devEnv,
      ctx,
    );
    assert.equal(authorized.status, 200);
    const body = await authorized.json();
    assert.equal(body.dryRun, true);
    assert.equal(calls, 1);
    assert.ok(!("members" in body));
  } finally {
    globalThis.fetch = original;
  }
});
