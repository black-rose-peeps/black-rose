import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let _supabase: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  // Node SSR (Node < 22): provide ws transport — package is in devDependencies
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require("ws") as typeof WebSocket;
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        transport: ws,
      },
    });
  } catch {
    // ws not available — create client without realtime (no SSR websocket needed)
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createSupabaseClient();
    }
    const value = (_supabase as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(_supabase)
      : value;
  },
});

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createSupabaseClient();
  }
  return _supabase;
}
