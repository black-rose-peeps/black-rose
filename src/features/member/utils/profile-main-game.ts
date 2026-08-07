import { normalizeGameKey } from "@/features/teams/constants";

/** Canonical main game for profile forms — keeps saved values selectable in the UI. */
export function resolveProfileMainGame(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";

  const normalized = normalizeGameKey(trimmed);
  if (normalized) return normalized;

  // Legacy fallback - allow any game value for dynamic games
  return trimmed;
}

/** Value persisted to member_profiles.main_game. Returns null for non-allowlisted games. */
export function resolveStoredMainGame(raw: string | null | undefined): string | null {
  const resolved = resolveProfileMainGame(raw);
  if (!resolved) return null;
  // For dynamic games, allow any value
  return resolved;
}

/** Get game select options - should be called with dynamic games from useActiveGames hook */
export function profileGameSelectOptions(
  currentGame: string,
  availableGames: readonly string[] = [],
): readonly string[] {
  const resolved = resolveProfileMainGame(currentGame);
  if (resolved && !availableGames.includes(resolved)) {
    return [...availableGames, resolved];
  }
  return availableGames;
}
