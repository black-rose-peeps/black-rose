import type { Env } from "./env";
import { getBoostWindowMinutes, getSyncQueueConfig } from "./env";
import { getBoostUntilMs, setBoostUntilMs } from "./boost";
import { syncRoseRoles, type SyncSummary } from "./sync";
import { syncMemberByDiscordId } from "./sync-member";

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(runScheduledSync(event, env));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "blackrose-discord-sync" });
    }

    if (url.pathname === "/sync" && request.method === "POST") {
      if (!isAuthorized(request, env)) return new Response("Unauthorized", { status: 401 });

      const priorityNotVerified = parsePriorityNotVerified(request);
      const promise = runSync(env, { priorityNotVerified });
      ctx.waitUntil(promise);
      const summary = await promise;
      return Response.json({ ...summary, queueConfig: getSyncQueueConfig(env) });
    }

    if (url.pathname === "/sync/member" && request.method === "POST") {
      if (!isAuthorized(request, env)) return new Response("Unauthorized", { status: 401 });

      let discordId = "";
      let clearSyncState = false;
      try {
        const body = (await request.json()) as {
          discordId?: string;
          clearSyncState?: boolean;
        };
        discordId = body.discordId?.trim() ?? "";
        clearSyncState = body.clearSyncState === true;
      } catch {
        return new Response("Invalid JSON body.", { status: 400 });
      }

      if (!discordId) {
        return new Response("Missing discordId.", { status: 400 });
      }

      const result = await syncMemberByDiscordId(env, discordId, { clearSyncState });
      return Response.json({
        discordId: result.discordId,
        status: result.status,
        updated: result.updated,
        hasRose: result.hasRose,
        notInGuild: result.notInGuild,
        syncPaused: result.syncPaused,
      });
    }

    if (url.pathname === "/sync/status" && request.method === "GET") {
      if (!isAuthorized(request, env)) return new Response("Unauthorized", { status: 401 });
      const boostUntilMs = await getBoostUntilMs(env);
      return Response.json({
        ...buildBoostStatus(boostUntilMs),
        queueConfig: getSyncQueueConfig(env),
      });
    }

    if (url.pathname === "/sync/boost" && request.method === "POST") {
      if (!isAuthorized(request, env)) return new Response("Unauthorized", { status: 401 });

      const currentBoostUntilMs = await getBoostUntilMs(env);
      const currentStatus = buildBoostStatus(currentBoostUntilMs);
      if (currentStatus.boostActive) {
        return Response.json({
          boosted: true,
          alreadyActive: true,
          ...currentStatus,
        });
      }

      const boostMinutes = getBoostWindowMinutes(env);
      const boostUntilMs = Date.now() + boostMinutes * 60 * 1000;
      await setBoostUntilMs(env, boostUntilMs);

      const promise = runSync(env, { priorityNotVerified: true });
      ctx.waitUntil(promise);
      const summary = await promise;

      return Response.json({
        boosted: true,
        alreadyActive: false,
        boostMinutes,
        ...buildBoostStatus(boostUntilMs),
        queueConfig: getSyncQueueConfig(env),
        summary,
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.SYNC_SECRET?.trim()) return false;
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return token === env.SYNC_SECRET;
}

function buildBoostStatus(boostUntilMs: number | null) {
  const nowMs = Date.now();
  const boostActive = Boolean(boostUntilMs && boostUntilMs > nowMs);
  return {
    boostActive,
    boostUntil: boostUntilMs ? new Date(boostUntilMs).toISOString() : null,
  };
}

async function runScheduledSync(event: ScheduledEvent, env: Env): Promise<void> {
  validateEnv(env);
  await runSync(env);
}

async function runSync(
  env: Env,
  options?: { priorityNotVerified?: boolean },
): Promise<SyncSummary> {
  validateEnv(env);

  try {
    const summary = await syncRoseRoles(env, options);
    console.info("[discord-sync] Complete", summary);
    return summary;
  } catch (err) {
    console.error(
      "[discord-sync] Run failed:",
      err instanceof Error ? err.message : err,
    );
    throw err;
  }
}

function parsePriorityNotVerified(request: Request): boolean {
  const url = new URL(request.url);
  const query = url.searchParams.get("priority");
  if (query === "1" || query === "true") return true;

  const header = request.headers.get("x-sync-priority")?.trim().toLowerCase();
  return header === "1" || header === "true";
}

function validateEnv(env: Env): void {
  const missing: string[] = [];
  if (!env.DISCORD_BOT_TOKEN?.trim()) missing.push("DISCORD_BOT_TOKEN");
  if (!env.DISCORD_GUILD_ID?.trim()) missing.push("DISCORD_GUILD_ID");
  if (!env.SUPABASE_URL?.trim()) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY?.trim()) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing Worker secrets/vars: ${missing.join(", ")}`);
  }
}
