import type { Env } from "./env";
import { getBaselineIntervalMinutes, getBoostWindowMinutes } from "./env";
import { getBoostUntilMs, setBoostUntilMs } from "./boost";
import { syncRoseRoles, type SyncSummary } from "./sync";

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

      const promise = runSync(env);
      ctx.waitUntil(promise);
      const summary = await promise;
      return Response.json(summary);
    }

    if (url.pathname === "/sync/status" && request.method === "GET") {
      if (!isAuthorized(request, env)) return new Response("Unauthorized", { status: 401 });
      const boostUntilMs = await getBoostUntilMs(env);
      return Response.json(buildBoostStatus(boostUntilMs));
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

      const promise = runSync(env);
      ctx.waitUntil(promise);
      const summary = await promise;

      return Response.json({
        boosted: true,
        alreadyActive: false,
        boostMinutes,
        ...buildBoostStatus(boostUntilMs),
        summary,
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.SYNC_SECRET) return true;
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

  const nowMs = Number.isFinite(event.scheduledTime) ? event.scheduledTime : Date.now();
  const boostUntilMs = await getBoostUntilMs(env);
  const isBoosted = Boolean(boostUntilMs && boostUntilMs > nowMs);
  const baselineMinutes = getBaselineIntervalMinutes(env);
  const minute = new Date(nowMs).getUTCMinutes();
  const onBaselineMinute = minute % baselineMinutes === 0;

  if (!isBoosted && !onBaselineMinute) {
    console.info(
      `[discord-sync] Skip minute (baseline every ${baselineMinutes} minutes)`,
    );
    return;
  }

  await runSync(env);
}

async function runSync(env: Env): Promise<SyncSummary> {
  validateEnv(env);

  try {
    const summary = await syncRoseRoles(env);
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
