import {
  createClient,
  type SupabaseClient,
  type WebSocketLikeConstructor,
} from "@supabase/supabase-js";
import ws from "ws";

let _adminClient: SupabaseClient | null = null;

/** Server-side Supabase client — requires service role key. */
export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing Supabase URL for server auth. Set VITE_SUPABASE_URL or SUPABASE_URL.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY for server auth. Server functions require the service role key.",
    );
  }

  // Node.js < 22 has no native WebSocket — required when supabase-js initializes Realtime.
  _adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as unknown as WebSocketLikeConstructor },
  });

  return _adminClient;
}
