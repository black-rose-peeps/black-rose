import assert from "node:assert/strict";
import test from "node:test";
const proof = await import("../src/features/game-membership/discord-role-proof").catch(() => null);
const user = "111111111111111111";
const second = "222222222222222222";
function module() {
  assert.ok(proof, "trusted Discord role-proof module must exist");
  return proof;
}
function target() {
  return {
    supabaseUrl: "https://xjwugbbrqpwnenmlrkdh.supabase.co",
    expectedProjectRef: "xjwugbbrqpwnenmlrkdh",
    guildId: module().DISCORD_GAME_GUILD_ID,
  };
}
function reader(response: (url: string) => Response | Promise<Response>) {
  const requests: string[] = [];
  const check = module().createDiscordRoleProofReader({
    token: "fixture-token",
    guildId: module().DISCORD_GAME_GUILD_ID,
    fetcher: async (input) => {
      const url = String(input);
      requests.push(url);
      return response(url);
    },
  });
  return { check, requests };
}
function roles() {
  return Response.json(module().DISCORD_GAME_ROLE_MAPPINGS.map(({ roleId }) => ({ id: roleId })));
}

test("Discord membership target must match explicit project and guild before any work", () => {
  const p = module();
  p.assertDiscordGameMembershipTarget(target());
  for (const bad of [
    { supabaseUrl: "https://efchfvreaotskrdlweze.supabase.co" },
    { expectedProjectRef: undefined },
    { guildId: "999999999999999999" },
    { supabaseUrl: "https://xjwugbbrqpwnenmlrkdh.supabase.co.attacker.invalid" },
    { supabaseUrl: "http://xjwugbbrqpwnenmlrkdh.supabase.co" },
  ])
    assert.throws(() => p.assertDiscordGameMembershipTarget({ ...target(), ...bad }));
  assert.equal(p.isDiscordGameMembershipEnabled(undefined), false);
  assert.equal(p.isDiscordGameMembershipEnabled("false"), false);
  assert.equal(p.isDiscordGameMembershipEnabled("true"), true);
});
test("role proof caches guild metadata, not member eligibility, and batches concurrent identical checks", async () => {
  const { check, requests } = reader((url) =>
    url.endsWith("/roles")
      ? roles()
      : Response.json({
          user: { id: url.split("/").at(-1) },
          roles: [module().DISCORD_GAME_ROLE_MAPPINGS[0].roleId],
        }),
  );
  const [a, b] = await Promise.all([check.read(user), check.read(user)]);
  assert.deepEqual(a, b);
  assert.equal(a.discord_id, user);
  assert.equal(a.not_in_guild, false);
  assert.equal(a.role_ids[0], module().DISCORD_GAME_ROLE_MAPPINGS[0].roleId);
  assert.ok(Number.isFinite(Date.parse(a.observed_at)));
  assert.equal(requests.length, 2);
  await check.read(second);
  await check.read(user);
  assert.equal(
    requests.length,
    4,
    "one guild metadata call and a fresh call for each non-concurrent member check",
  );
});
test("only authoritative Unknown Member is guild absence; other failures never become empty role proofs", async () => {
  const missing = reader((url) =>
    url.endsWith("/roles") ? roles() : Response.json({ code: 10007 }, { status: 404 }),
  );
  assert.equal((await missing.check.read(user)).not_in_guild, true);
  for (const [status, code] of [
    [403, 50013],
    [404, 10004],
    [500, 0],
    [429, 0],
  ]) {
    const { check } = reader((url) =>
      url.endsWith("/roles") ? roles() : Response.json({ code, retry_after: 2 }, { status }),
    );
    await assert.rejects(check.read(user), module().DiscordRoleProofError);
  }
});
test("malformed role snapshots and identity mismatches fail closed", async () => {
  for (const data of [
    { user: { id: user } },
    { user: { id: user }, roles: [123] },
    { user: { id: second }, roles: [] },
    { roles: [] },
    null,
  ]) {
    const { check } = reader((url) => (url.endsWith("/roles") ? roles() : Response.json(data)));
    await assert.rejects(check.read(user));
  }
});
test("deleted configured role prevents proof creation rather than causing mass inactive changes", async () => {
  const { check, requests } = reader(() =>
    Response.json([{ id: module().DISCORD_GAME_ROLE_MAPPINGS[0].roleId }]),
  );
  await assert.rejects(check.read(user), /role/i);
  assert.equal(requests.length, 1);
});

test("confirmation cannot reuse a catalog request started before a later member snapshot", async () => {
  let metadataCalls = 0;
  let finishOlder!: (value: Response) => void;
  const older = new Promise<Response>((resolve) => {
    finishOlder = resolve;
  });
  const { check } = reader((url) => {
    if (!url.endsWith("/roles"))
      return Response.json({ user: { id: url.split("/").at(-1) }, roles: [] });
    metadataCalls++;
    if (metadataCalls === 2) return older;
    if (metadataCalls > 2) return Response.json([]); // configured role deleted after older request began
    return roles();
  });
  await check.read(user);
  const olderConfirmation = check.confirmMappings();
  await check.read(second);
  const newerConfirmation = check.confirmMappings().then(
    () => null,
    (error: unknown) => error,
  );
  finishOlder(roles());
  await olderConfirmation;
  const failure = await newerConfirmation;
  assert.ok(failure instanceof module().DiscordRoleProofError);
  assert.equal(metadataCalls, 3);
});

test("simultaneous confirmations still coalesce when no newer member snapshot exists", async () => {
  const { check, requests } = reader((url) =>
    url.endsWith("/roles") ? roles() : Response.json({ user: { id: user }, roles: [] }),
  );
  await check.read(user);
  await Promise.all([check.confirmMappings(), check.confirmMappings()]);
  assert.equal(requests.length, 3);
});
test("request budget callback accounts for every fetch and can prevent network I/O", async () => {
  let attempts = 0,
    network = 0;
  const check = module().createDiscordRoleProofReader({
    token: "fixture",
    guildId: module().DISCORD_GAME_GUILD_ID,
    onRequest() {
      attempts++;
      if (attempts > 1) throw new Error("Budget exhausted");
    },
    fetcher: async () => {
      network++;
      return roles();
    },
  });
  await assert.rejects(check.read(user), /Budget/);
  assert.equal(attempts, 2);
  assert.equal(network, 1);
});
test("mapping identifiers are exact string tokens, including the specific Forever and Aion roles", () => {
  assert.deepEqual(
    module().DISCORD_GAME_ROLE_MAPPINGS.map((x) => x.roleId),
    [
      "1548977405069234256",
      "1547101455125577789",
      "1465129387182522450",
      "1475345886434295898",
      "1465128743726219287",
      "1331615176784482306",
      "1439483814182129695",
    ],
  );
});
