import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let _supabase: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  // supabase-js v2 synchronously checks globalThis.WebSocket when constructing
  // the Realtime client. In Node < 22 (SSR) this throws even when Realtime is
  // never used. Defer construction to the browser where WebSocket is always present.
  if (typeof window === "undefined") {
    // Return a proxy that throws a clear error only when actually called in SSR.
    // Route loaders that call Supabase should guard with:
    //   if (typeof window === 'undefined') return fallback;
    // See admin.tournaments.$id.tsx loader.
    return new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        throw new Error(
          `Supabase cannot be used during SSR (called property: ${String(prop)}). ` +
            "Add a server-side guard or move this call to a client-side hook.",
        );
      },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey);
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
