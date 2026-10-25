import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireMemberSession } from "@/features/auth/server/trusted-session.server";
import type {
  GameMembershipAcceptance,
  GameMembershipAcceptanceFeed,
} from "../types/game-membership";

type Row = Record<string, unknown>;
const MAX_ACCEPTANCE_EVENTS = 100;
const record = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};

/** Read an owner's bounded acceptance history without exposing private audit metadata. */
export async function fetchMyGameMembershipAcceptances(): Promise<GameMembershipAcceptanceFeed> {
  const { memberId } = await requireMemberSession();
  const client = getSupabaseAdmin();
  const events = new Map<string, GameMembershipAcceptance>();
  for (let from = 0; from < MAX_ACCEPTANCE_EVENTS; ) {
    const { data, error } = await client
      .from("game_membership_events")
      .select("id, game_id, old_status, created_at, games(id, name, display_name, is_active)")
      .eq("member_id", memberId)
      .eq("new_status", "accepted")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, MAX_ACCEPTANCE_EVENTS - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const value of data as unknown[]) {
      const row = record(value);
      const game = record(Array.isArray(row.games) ? row.games[0] : row.games);
      const name =
        typeof game.display_name === "string" && game.display_name.trim()
          ? game.display_name.trim()
          : typeof game.name === "string"
            ? game.name.trim()
            : "";
      if (
        row.old_status === "accepted" ||
        game.is_active !== true ||
        !name ||
        typeof row.id !== "string" ||
        !row.id ||
        typeof row.game_id !== "string" ||
        !row.game_id ||
        game.id !== row.game_id ||
        typeof row.created_at !== "string" ||
        !Number.isFinite(Date.parse(row.created_at))
      )
        continue;
      events.set(row.id, {
        eventId: row.id,
        gameId: row.game_id,
        gameName: name,
        createdAt: row.created_at,
      });
    }
    from += data.length;
  }
  return { memberId, events: [...events.values()] };
}
