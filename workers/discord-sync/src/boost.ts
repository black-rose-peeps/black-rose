import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";

const FLAG_KEY = "discord_sync_boost_until";
const FLAGS_TABLE = "worker_runtime_flags";

export async function getBoostUntilMs(env: Env): Promise<number | null> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from(FLAGS_TABLE)
    .select("value")
    .eq("key", FLAG_KEY)
    .maybeSingle();

  if (error) {
    // If table is not created yet, run with baseline cadence.
    if (error.code === "42P01") return null;
    throw new Error(`Failed to read boost window: ${error.message}`);
  }

  const value = (data as { value?: string } | null)?.value?.trim();
  if (!value) return null;

  const boostUntilMs = Date.parse(value);
  return Number.isNaN(boostUntilMs) ? null : boostUntilMs;
}

export async function setBoostUntilMs(env: Env, boostUntilMs: number): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const value = new Date(boostUntilMs).toISOString();
  const { error } = await supabase.from(FLAGS_TABLE).upsert(
    {
      key: FLAG_KEY,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(
      `Failed to set boost window. Did you run docs/sql/worker_runtime_flags.sql? (${error.message})`,
    );
  }
}
