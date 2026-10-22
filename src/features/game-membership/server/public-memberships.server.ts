import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AcceptedGameMembership } from "@/features/member/types";
import { sanitizeHttpUrl } from "@/features/member/utils/validate-social-url";

type CatalogSummary = {
  id: string;
  name: string;
  display_name: string;
  icon: string | null;
  is_active: boolean;
};
type MembershipSummaryRow = {
  game_id: string;
  games: CatalogSummary | CatalogSummary[] | null;
};

/** Call only after the enclosing profile's viewer/privacy authorization succeeds. */
export async function fetchAcceptedGameMemberships(
  memberId: string,
): Promise<AcceptedGameMembership[]> {
  const summaries = new Map<string, AcceptedGameMembership>();
  const client = getSupabaseAdmin();
  for (let from = 0; ; ) {
    const { data, error } = await client
      .from("game_memberships")
      .select("game_id, games(id, name, display_name, icon, is_active)")
      .eq("member_id", memberId)
      .eq("status", "accepted")
      .order("game_id")
      .range(from, from + 499);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const row of data as unknown as MembershipSummaryRow[]) {
      const game = Array.isArray(row.games) ? row.games[0] : row.games;
      const name = game?.display_name?.trim() || game?.name?.trim();
      if (!game || game.is_active !== true || !name || !row.game_id) continue;
      const icon = typeof game.icon === "string" ? game.icon.trim() : "";
      summaries.set(row.game_id, {
        gameId: row.game_id,
        gameName: name,
        gameIcon:
          icon.startsWith("/") && !icon.startsWith("//") && !icon.includes("\\")
            ? icon
            : sanitizeHttpUrl(icon),
      });
    }
    from += data.length;
  }
  return [...summaries.values()].sort(
    (a, b) => a.gameName.localeCompare(b.gameName) || a.gameId.localeCompare(b.gameId),
  );
}
