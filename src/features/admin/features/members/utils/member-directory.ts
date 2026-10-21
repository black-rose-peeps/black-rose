import type { Game } from "../../games/services/games.service";
import type { AdminMember } from "../types";
import { formatValorantRiotId } from "../../../../member/utils/valorant-identity";
import { normalizeGameKey } from "@/features/teams/constants";

export type DirectoryGame = Pick<Game, "id" | "name" | "slug" | "display_name" | "identity_group">;
export type DirectoryMode = "identity" | "main";
export type DirectoryRoleFilter = "all" | "unknown" | `role:${string}`;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesGame(value: string, game: DirectoryGame): boolean {
  const canonicalValue = normalize(normalizeGameKey(normalize(value)) ?? "");
  if (!canonicalValue) return false;
  return [game.name, game.display_name, game.slug].some(
    (alias) => normalize(normalizeGameKey(normalize(alias)) ?? "") === canonicalValue,
  );
}

export function getDirectoryIdentity(member: AdminMember, game: DirectoryGame): string | null {
  if (getDirectoryIdentityLabel(game) === "Shared Riot ID") {
    const riotId = formatValorantRiotId(
      member.valorantGameName ?? "",
      member.valorantTagline ?? "",
    );
    if (riotId) return riotId;
  }
  for (const [key, value] of Object.entries(member.gameIdentities ?? {})) {
    if (matchesGame(key, game) && value.trim()) return value.trim();
  }
  return matchesGame(member.mainGame ?? "", game) ? member.ingameDisplayName?.trim() || null : null;
}

export function getDirectoryIdentityLabel(game: DirectoryGame): string {
  const riotTitles = ["valorant", "league of legends", "teamfight tactics"];
  return normalize(game.identity_group ?? "") === "riot" ||
    [game.name, game.display_name].some((name) => riotTitles.includes(normalize(name)))
    ? "Shared Riot ID"
    : "IGN";
}

/** Only main-game roles are currently stored; secondary-game roles are unknown. */
export function getDirectoryRole(member: AdminMember, game: DirectoryGame): string | null {
  return matchesGame(member.mainGame ?? "", game) ? member.mainRole?.trim() || null : null;
}

export function matchesDirectoryFilter(
  member: AdminMember,
  game: DirectoryGame | null,
  mode: DirectoryMode,
  role: DirectoryRoleFilter,
): boolean {
  if (!game) return true;
  if (
    mode === "main"
      ? !matchesGame(member.mainGame ?? "", game)
      : !getDirectoryIdentity(member, game)
  )
    return false;
  if (role === "all") return true;
  const savedRole = getDirectoryRole(member, game);
  return role === "unknown"
    ? !savedRole
    : !!savedRole && normalize(savedRole) === normalize(role.slice(5));
}

function csvCell(value: string): string {
  // Quoting alone doesn't prevent spreadsheet formula execution (including after whitespace).
  const safe = /^[\s\uFEFF]*[=+\-@\t\r\n]/u.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Receives all filtered/sorted results, never the current page. No private IDs or contact data. */
export function buildMemberDirectoryCsv(
  members: AdminMember[],
  game: DirectoryGame | null,
): string {
  const headers = [
    "Name",
    "Discord username",
    "Status",
    "Main game",
    "Selected game",
    game ? getDirectoryIdentityLabel(game) : "Selected game identity",
    game ? "Selected game role (main-game only)" : "Main role",
  ];
  const rows = members.map((member) => [
    member.displayName,
    member.discordUsername,
    member.status,
    member.mainGame ?? "",
    game?.display_name ?? "",
    game ? (getDirectoryIdentity(member, game) ?? "") : "",
    game ? (getDirectoryRole(member, game) ?? "") : (member.mainRole ?? ""),
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
