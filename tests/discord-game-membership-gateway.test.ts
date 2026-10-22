import assert from "node:assert/strict";
import { test, mock } from "node:test";

const events: unknown[][] = [];
mock.module("../src/features/auth/server/discord-guild.server.ts", {
  namedExports: {
    resolveRoseRoleId: async () => "rose",
  },
});
mock.module("../src/features/auth/server/discord-verification.server.ts", {
  namedExports: {
    applyVerificationFromRoleIds: async (...args: unknown[]) => {
      events.push(["rose", ...args]);
    },
  },
});
mock.module("../src/features/game-membership/server/discord-game-membership.server.ts", {
  namedExports: {
    syncDiscordGameMembershipByDiscordId: async (...args: unknown[]) => {
      events.push(["fresh-membership", ...args]);
    },
  },
});
const { handleDiscordMembershipEvent } =
  await import("../src/features/auth/server/discord-role-bot.server.ts");
const guildId = "1193921905795792906";
const userId = "123456789012345678";
function configure(enabled = "true") {
  events.length = 0;
  process.env.DISCORD_GAME_MEMBERSHIP_ENABLED = enabled;
  process.env.DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF = "xjwugbbrqpwnenmlrkdh";
  process.env.VITE_SUPABASE_URL = "https://xjwugbbrqpwnenmlrkdh.supabase.co";
  process.env.DISCORD_GUILD_ID = guildId;
}
test("Gateway updates preserve ROSE order then request a fresh authoritative membership proof, never event roles", async () => {
  configure();
  await handleDiscordMembershipEvent(
    "GUILD_MEMBER_UPDATE",
    { guild_id: guildId, user: { id: userId }, roles: ["old-event-role"] },
    { guildId, roseRoleId: "rose" },
  );
  assert.deepEqual(events, [
    ["rose", userId, ["old-event-role"], "rose"],
    ["fresh-membership", userId],
  ]);
});

test("Gateway remove is a fresh REST wake-up, not trusted absence or a ROSE write", async () => {
  configure();
  await handleDiscordMembershipEvent(
    "GUILD_MEMBER_REMOVE",
    { guild_id: guildId, user: { id: userId } },
    { guildId, roseRoleId: "rose" },
  );
  assert.deepEqual(events, [["fresh-membership", userId]]);
});

test("Gateway disabled path preserves ROSE and never reads or writes game memberships", async () => {
  configure("false");
  process.env.VITE_SUPABASE_URL = "https://fixture-invalid.example";
  await handleDiscordMembershipEvent(
    "GUILD_MEMBER_UPDATE",
    { guild_id: guildId, user: { id: userId }, roles: [] },
    { guildId, roseRoleId: "rose" },
  );
  await handleDiscordMembershipEvent(
    "GUILD_MEMBER_REMOVE",
    { guild_id: guildId, user: { id: userId } },
    { guildId, roseRoleId: "rose" },
  );
  assert.deepEqual(events, [["rose", userId, [], "rose"]]);
});

test("Gateway rejects wrong effective project before either ROSE or membership writes", async () => {
  configure();
  process.env.VITE_SUPABASE_URL = "https://efchfvreaotskrdlweze.supabase.co";
  process.env.SUPABASE_URL = "https://xjwugbbrqpwnenmlrkdh.supabase.co";
  await assert.rejects(
    handleDiscordMembershipEvent(
      "GUILD_MEMBER_UPDATE",
      { guild_id: guildId, user: { id: userId }, roles: [] },
      { guildId, roseRoleId: "rose" },
    ),
    /project|target/i,
  );
  assert.deepEqual(events, []);
});

test("Gateway ignores unrelated guilds and malformed events", async () => {
  configure();
  for (const data of [
    null,
    {},
    { guild_id: guildId, roles: [] },
    { guild_id: "other", user: { id: userId }, roles: [] },
  ]) {
    await handleDiscordMembershipEvent("GUILD_MEMBER_UPDATE", data, {
      guildId,
      roseRoleId: "rose",
    });
  }
  assert.deepEqual(events, []);
});

test("reordered Gateway role payloads each trigger authoritative reconciliation with ID only", async () => {
  configure();
  for (const roles of [["new"], ["stale"]])
    await handleDiscordMembershipEvent(
      "GUILD_MEMBER_UPDATE",
      { guild_id: guildId, user: { id: userId }, roles },
      { guildId, roseRoleId: "rose" },
    );
  assert.deepEqual(
    events.filter((e) => e[0] === "fresh-membership"),
    [
      ["fresh-membership", userId],
      ["fresh-membership", userId],
    ],
  );
});
