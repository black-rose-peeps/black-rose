import WebSocket from "ws";
import {
  getConfiguredRoseRoleName,
  getDiscordBotToken,
  getDiscordGuildId,
  isDiscordRoleSyncConfigured,
} from "./discord-config.server";
import { applyVerificationFromRoleIds } from "./discord-verification.server";
import { resolveRoseRoleId } from "./discord-guild.server";
import {
  assertDiscordGameMembershipTarget,
  isDiscordGameMembershipEnabled,
} from "../../game-membership/discord-role-proof";
import { syncDiscordGameMembershipByDiscordId } from "../../game-membership/server/discord-game-membership.server";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_USER_AGENT = "BlackRoseArena (https://blackrose.asia, 1.0.0)";
/** GUILDS (1 << 0) | GUILD_MEMBERS (1 << 1) — required for GUILD_MEMBER_UPDATE. */
const GATEWAY_INTENTS = (1 << 0) | (1 << 1);

interface GatewayPayload {
  op: number;
  t?: string;
  s?: number | null;
  d?: unknown;
}

interface GatewayHello {
  heartbeat_interval: number;
}

interface GatewayReady {
  session_id: string;
  resume_gateway_url: string;
}

interface GuildMemberUpdate {
  guild_id: string;
  roles: string[];
  user?: { id: string };
}

async function fetchGatewayBotUrl(): Promise<string> {
  const token = getDiscordBotToken();
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.");
  }

  const response = await fetch(`${DISCORD_API_BASE}/gateway/bot`, {
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": DISCORD_USER_AGENT,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord gateway/bot failed (${response.status}): ${detail}`);
  }

  const body = (await response.json()) as { url: string };
  return `${body.url}?v=10&encoding=json`;
}

function parseMemberUpdate(data: unknown): GuildMemberUpdate | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const guildId = record.guild_id;
  const roles = record.roles;
  const user = record.user;
  if (typeof guildId !== "string" || !Array.isArray(roles)) return null;
  const userId =
    user && typeof user === "object" && typeof (user as { id?: string }).id === "string"
      ? (user as { id: string }).id
      : undefined;
  return {
    guild_id: guildId,
    roles: roles.filter((role): role is string => typeof role === "string"),
    user: userId ? { id: userId } : undefined,
  };
}

function assertGatewayMembershipTarget(guildId: string): void {
  if (!isDiscordGameMembershipEnabled(process.env.DISCORD_GAME_MEMBERSHIP_ENABLED)) return;
  assertDiscordGameMembershipTarget({
    // Match getSupabaseAdmin's URL precedence exactly.
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    expectedProjectRef: process.env.DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF,
    guildId,
  });
}

/** Events are wake-ups only: the membership adapter always reads authoritative REST. */
export async function handleDiscordMembershipEvent(
  eventType: string | undefined,
  data: unknown,
  config: { guildId: string; roseRoleId: string },
): Promise<void> {
  if (eventType !== "GUILD_MEMBER_UPDATE" && eventType !== "GUILD_MEMBER_REMOVE") return;
  if (!data || typeof data !== "object") return;
  const event = data as { guild_id?: unknown; user?: { id?: unknown } };
  if (event.guild_id !== config.guildId || typeof event.user?.id !== "string") return;
  assertGatewayMembershipTarget(config.guildId);
  if (eventType === "GUILD_MEMBER_UPDATE") {
    const update = parseMemberUpdate(data);
    if (!update) return;
    await applyVerificationFromRoleIds(event.user.id, update.roles, config.roseRoleId);
  }
  if (isDiscordGameMembershipEnabled(process.env.DISCORD_GAME_MEMBERSHIP_ENABLED)) {
    await syncDiscordGameMembershipByDiscordId(event.user.id);
  }
}

/** Long-running Discord Gateway worker — updates Supabase when ROSE role changes. */
export async function startDiscordRoleBot(): Promise<void> {
  if (!isDiscordRoleSyncConfigured()) {
    throw new Error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.");
  }

  const token = getDiscordBotToken()!;
  const guildId = getDiscordGuildId()!;
  assertGatewayMembershipTarget(guildId);
  const roseRoleId = await resolveRoseRoleId();

  if (!roseRoleId) {
    throw new Error(
      `Could not resolve the ROSE role. Set DISCORD_ROSE_ROLE_ID or create a role named ${getConfiguredRoseRoleName()} in the guild.`,
    );
  }

  console.info(`[discord-bot] Guild ${guildId} — ROSE role ${roseRoleId}`);
  console.info("[discord-bot] Listening for GUILD_MEMBER_UPDATE…");

  let resumeGatewayUrl: string | null = null;
  let sessionId: string | null = null;
  let lastSequence: number | null = null;
  let reconnectAttempt = 0;

  const connect = (): void => {
    void (async () => {
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const reconnect = (reason: string): void => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        reconnectAttempt += 1;
        const delayMs = Math.min(30_000, 1_000 * 2 ** Math.min(reconnectAttempt, 5));
        console.warn(`[discord-bot] ${reason} Reconnecting in ${delayMs}ms…`);
        setTimeout(connect, delayMs);
      };

      try {
        const url = resumeGatewayUrl ?? (await fetchGatewayBotUrl());
        const ws = new WebSocket(url);

        ws.on("message", (raw) => {
          let payload: GatewayPayload;
          try {
            payload = JSON.parse(raw.toString()) as GatewayPayload;
          } catch {
            return;
          }

          if (typeof payload.s === "number") {
            lastSequence = payload.s;
          }

          switch (payload.op) {
            case 10: {
              const hello = payload.d as GatewayHello;
              if (heartbeatTimer) clearInterval(heartbeatTimer);
              heartbeatTimer = setInterval(() => {
                ws.send(JSON.stringify({ op: 1, d: lastSequence }));
              }, hello.heartbeat_interval);

              if (sessionId && resumeGatewayUrl) {
                ws.send(
                  JSON.stringify({
                    op: 6,
                    d: {
                      token: `Bot ${token}`,
                      session_id: sessionId,
                      seq: lastSequence,
                    },
                  }),
                );
              } else {
                ws.send(
                  JSON.stringify({
                    op: 2,
                    d: {
                      token: `Bot ${token}`,
                      intents: GATEWAY_INTENTS,
                      properties: {
                        os: "linux",
                        browser: "blackrose-arena",
                        device: "blackrose-arena",
                      },
                    },
                  }),
                );
              }
              break;
            }
            case 0: {
              if (payload.t === "READY") {
                const ready = payload.d as GatewayReady;
                sessionId = ready.session_id;
                resumeGatewayUrl = `${ready.resume_gateway_url}?v=10&encoding=json`;
                reconnectAttempt = 0;
                console.info("[discord-bot] Ready");
              }

              if (payload.t === "GUILD_MEMBER_UPDATE" || payload.t === "GUILD_MEMBER_REMOVE") {
                void handleDiscordMembershipEvent(payload.t, payload.d, {
                  guildId,
                  roseRoleId,
                }).catch((err) => {
                  console.error(
                    "[discord-bot] Failed to sync member:",
                    err instanceof Error ? err.message : err,
                  );
                });
              }
              break;
            }
            case 7:
              ws.close();
              break;
            case 9:
              sessionId = null;
              resumeGatewayUrl = null;
              ws.close();
              break;
            case 11:
              break;
            default:
              break;
          }
        });

        ws.on("close", (code) => {
          reconnect(`Disconnected (${code}).`);
        });

        ws.on("error", (err) => {
          console.error("[discord-bot] WebSocket error:", err);
        });
      } catch (err) {
        reconnect(err instanceof Error ? err.message : "Connect failed.");
      }
    })();
  };

  connect();

  await new Promise<void>(() => {
    // Keep process alive while the Gateway connection runs.
  });
}
