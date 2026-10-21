import type {
  GameMembershipStatus,
  GameRosterEntry,
  GameRosterInput,
  MembershipGame,
} from "../types";

export type GameRosterFilters = Omit<GameRosterInput, "gameId" | "status"> & {
  status?: GameMembershipStatus | "none";
};

export function filterGameRoster(
  rows: GameRosterEntry[],
  filters: GameRosterFilters,
  search: string,
): GameRosterEntry[] {
  const query = search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (!filters.status ||
        (filters.status === "none"
          ? !row.membership
          : row.membership?.status === filters.status)) &&
      (!filters.roleId || row.profile?.roleId === filters.roleId) &&
      (!filters.className || row.profile?.className === filters.className) &&
      (!filters.serverName || row.profile?.serverName === filters.serverName) &&
      (!filters.faction || row.profile?.faction === filters.faction) &&
      (!query ||
        [row.displayName, row.discordUsername, row.profile?.ign].some((text) =>
          text?.toLowerCase().includes(query),
        )),
  );
}

const csvCell = (value: string) => {
  const safe =
    // eslint-disable-next-line no-control-regex -- Detect control-prefixed spreadsheet formulas too.
    /^[\s\u0000-\u001f]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};
export function buildGameRosterCsv(game: MembershipGame, rows: GameRosterEntry[]): string {
  const fields = (["class", "server", "faction"] as const).filter(
    (key) => game.profile_field_config?.[key]?.enabled,
  );
  const header = [
    "Game",
    "Display name",
    "Discord username",
    "IGN",
    "Game membership",
    "Role",
    ...fields.map((key) => game.profile_field_config![key]!.label),
  ];
  return [
    header,
    ...rows.map((row) => [
      game.display_name,
      row.displayName,
      row.discordUsername,
      row.profile?.ign ?? "",
      row.membership?.status ?? "No membership",
      row.profile?.roleLabel ?? "",
      ...fields.map(
        (key) =>
          (key === "class"
            ? row.profile?.className
            : key === "server"
              ? row.profile?.serverName
              : row.profile?.faction) ?? "",
      ),
    ]),
  ]
    .map((cells) => cells.map(csvCell).join(","))
    .join("\r\n");
}

export function gameMembershipChangeError(
  game: MembershipGame,
  row: GameRosterEntry,
  status: GameMembershipStatus,
): string | null {
  if (!game.is_active && status !== "inactive" && status !== "left")
    return "This game is inactive. Only inactive or left status may be set.";
  if ((status === "accepted" || status === "applying") && !row.profile?.ign.trim())
    return "A saved IGN is required before setting Applying or Accepted. Ask the member to save their game profile first.";
  return null;
}

export interface AdminMembershipChange {
  memberId: string;
  gameId: string;
  status: GameMembershipStatus;
  reason?: string;
}
const pendingChanges = new Map<string, Promise<void>>();

export async function submitAdminMembershipChange(
  game: MembershipGame,
  row: GameRosterEntry,
  status: GameMembershipStatus,
  reason: string,
  save: (input: AdminMembershipChange) => Promise<unknown>,
  refresh: () => Promise<unknown>,
) {
  const error = gameMembershipChangeError(game, row, status);
  if (error) throw new Error(error);
  const key = JSON.stringify([game.id, row.memberId]);
  const pending = pendingChanges.get(key);
  if (pending) return pending;
  const change = (async () => {
    await save({
      memberId: row.memberId,
      gameId: game.id,
      status,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
    try {
      await refresh();
    } catch (cause) {
      throw new Error(
        "Membership status was saved, but the roster could not refresh. Retry roster to confirm the latest status.",
        { cause },
      );
    }
  })();
  pendingChanges.set(key, change);
  try {
    await change;
  } finally {
    pendingChanges.delete(key);
  }
}
