import type { Env } from "./env";
import { syncRoseRoles } from "./sync";

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(runSync(env));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "blackrose-discord-sync" });
    }

    if (url.pathname === "/sync" && request.method === "POST") {
      if (env.SYNC_SECRET) {
        const auth = request.headers.get("authorization");
        const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
        if (token !== env.SYNC_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      const promise = runSync(env);
      ctx.waitUntil(promise);
      const summary = await promise;
      return Response.json(summary);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function runSync(env: Env): Promise<Record<string, number>> {
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
