import { PROFILE_GAME_OPTIONS } from "../constants";
import { normalizeGameKey } from "@/features/teams/constants";

/** Canonical main game for profile forms — keeps saved values selectable in the UI. */
export function resolveProfileMainGame(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";

  const normalized = normalizeGameKey(trimmed);
  if (normalized) return normalized;

  if ((PROFILE_GAME_OPTIONS as readonly string[]).includes(trimmed)) return trimmed;

  return trimmed;
}

/** Value persisted to member_profiles.main_game. */
export function resolveStoredMainGame(raw: string | null | undefined): string | null {
  const resolved = resolveProfileMainGame(raw);
  return resolved || null;
}

export function profileGameSelectOptions(currentGame: string): readonly string[] {
  const resolved = resolveProfileMainGame(currentGame);
  if (resolved && !(PROFILE_GAME_OPTIONS as readonly string[]).includes(resolved)) {
    return [...PROFILE_GAME_OPTIONS, resolved];
  }
  return PROFILE_GAME_OPTIONS;
}
