import { normalizeGameKey } from "@/features/teams/constants";
import { validateValorantIdentityInput } from "@/features/member/utils/valorant-identity";
import {
  GAME_MEMBERSHIP_STATUSES,
  type GameMembershipStatus,
  type GameProfileFieldConfig,
  type GameProfileFieldKey,
  type GameRosterInput,
  type MemberGameProfile,
  type MemberMembershipAction,
  type MembershipGame,
  type SaveGameProfileInput,
} from "./types";

const FIELD_KEYS: GameProfileFieldKey[] = ["class", "server", "faction"];
const ACTIONS: MemberMembershipAction[] = ["interest", "apply", "withdraw", "leave"];

function object(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an object.");
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`Unexpected field: ${key}.`);
  }
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 80): string {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  if (
    [...value].some((char) => {
      const code = char.codePointAt(0)!;
      return code <= 31 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029;
    })
  )
    throw new Error(`${label} cannot contain control characters.`);
  if (value.length > max) throw new Error(`${label} must be at most ${max} characters.`);
  return value.trim();
}
export function requireUuid(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}
function status(value: unknown): GameMembershipStatus {
  if (!GAME_MEMBERSHIP_STATUSES.includes(value as GameMembershipStatus))
    throw new Error("Invalid membership status.");
  return value as GameMembershipStatus;
}
export function parseSaveGameProfileInput(value: unknown): SaveGameProfileInput {
  const row = object(value, ["gameId", "ign", "roleId", "className", "serverName", "faction"]);
  return {
    gameId: requireUuid(row.gameId, "gameId"),
    ign: text(row.ign, "IGN", 100),
    roleId: row.roleId === null ? null : requireUuid(row.roleId, "roleId"),
    className: text(row.className, "Class"),
    serverName: text(row.serverName, "Server"),
    faction: text(row.faction, "Faction"),
  };
}
export function parseMemberAction(value: unknown): {
  gameId: string;
  action: MemberMembershipAction;
} {
  const row = object(value, ["gameId", "action"]);
  if (!ACTIONS.includes(row.action as MemberMembershipAction))
    throw new Error("Invalid membership action.");
  return {
    gameId: requireUuid(row.gameId, "gameId"),
    action: row.action as MemberMembershipAction,
  };
}
export function parseAdminMembershipInput(value: unknown): {
  memberId: string;
  gameId: string;
  status: GameMembershipStatus;
  reason?: string;
} {
  const row = object(value, ["memberId", "gameId", "status", "reason"]);
  return {
    memberId: requireUuid(row.memberId, "memberId"),
    gameId: requireUuid(row.gameId, "gameId"),
    status: status(row.status),
    ...(row.reason === undefined ? {} : { reason: text(row.reason, "Reason", 1000) }),
  };
}
export function parseGameRosterInput(value: unknown): GameRosterInput {
  const row = object(value, ["gameId", "status", "roleId", "className", "serverName", "faction"]);
  return {
    gameId: requireUuid(row.gameId, "gameId"),
    ...(row.status === undefined ? {} : { status: status(row.status) }),
    ...(row.roleId === undefined ? {} : { roleId: requireUuid(row.roleId, "roleId") }),
    ...(row.className === undefined ? {} : { className: text(row.className, "Class") }),
    ...(row.serverName === undefined ? {} : { serverName: text(row.serverName, "Server") }),
    ...(row.faction === undefined ? {} : { faction: text(row.faction, "Faction") }),
  };
}
export function matchesCatalogGame(
  value: string,
  game: { name: string; display_name: string; slug: string },
): boolean {
  const normalize = (name: string) => normalizeGameKey(name)?.trim().toLowerCase() ?? "";
  return (
    !!normalize(value) &&
    [game.name, game.display_name, game.slug].some((name) => normalize(name) === normalize(value))
  );
}
export function legacyGameKeys(game: {
  name: string;
  display_name: string;
  slug: string;
}): string[] {
  return [
    ...new Set(
      [game.name, game.display_name, game.slug, "WWM", "LoL", "TFT", "MR"].filter((key) =>
        matchesCatalogGame(key, game),
      ),
    ),
  ];
}
export function normalizeProfileFieldConfig(value: unknown): GameProfileFieldConfig {
  const row = object(value ?? {}, FIELD_KEYS);
  const result: GameProfileFieldConfig = {};
  for (const key of FIELD_KEYS) {
    if (row[key] === undefined) continue;
    const field = object(row[key], ["enabled", "label", "kind", "options"]);
    if (typeof field.enabled !== "boolean") throw new Error(`Invalid ${key} enabled flag.`);
    if (field.kind !== "text" && field.kind !== "select")
      throw new Error(`Invalid ${key} input kind.`);
    if (!Array.isArray(field.options) || field.options.length > 100)
      throw new Error(`Invalid ${key} options.`);
    const options = field.options.map((option) => text(option, `${key} option`));
    if (options.some((option) => !option) || new Set(options).size !== options.length)
      throw new Error(`${key} options must be nonempty and unique.`);
    const label = text(field.label, `${key} label`, 60);
    if (!label) throw new Error(`${key} needs a label.`);
    if (field.enabled && field.kind === "select" && options.length === 0)
      throw new Error(`${label} needs at least one option.`);
    result[key] = { enabled: field.enabled, label, kind: field.kind, options };
  }
  return result;
}
export function validateGameProfile(
  input: SaveGameProfileInput,
  game: MembershipGame,
  previous: MemberGameProfile | null,
  membership: GameMembershipStatus | null,
): SaveGameProfileInput {
  if (!game.is_active) throw new Error("This game is inactive; saved information is preserved.");
  if (input.roleId) {
    const role = game.roles.find((item) => item.id === input.roleId);
    if (
      !role ||
      role.game_id !== game.id ||
      ("is_active" in role && role.is_active === false && previous?.roleId !== role.id)
    ) {
      throw new Error("Choose an active role configured for this game.");
    }
  }
  if (!input.ign && (membership === "accepted" || membership === "applying"))
    throw new Error("An applying or accepted membership requires a saved IGN.");
  const riot =
    game.identity_group === "riot" ||
    ["Valorant", "League of Legends", "Teamfight Tactics"].some((name) =>
      matchesCatalogGame(name, game),
    );
  if (riot && input.ign) {
    const separator = input.ign.lastIndexOf("#");
    const issue = validateValorantIdentityInput(
      separator < 0 ? input.ign : input.ign.slice(0, separator),
      separator < 0 ? "" : input.ign.slice(separator + 1),
    );
    if (issue) throw new Error(issue);
  }
  const result = { ...input };
  const fields = normalizeProfileFieldConfig(game.profile_field_config ?? {});
  for (const [key, property] of [
    ["class", "className"],
    ["server", "serverName"],
    ["faction", "faction"],
  ] as const) {
    const field = fields[key];
    if (!field?.enabled) {
      result[property] = previous?.[property] ?? "";
      continue;
    }
    const value = result[property];
    if (
      value &&
      field.kind === "select" &&
      !field.options.includes(value) &&
      previous?.[property] !== value
    ) {
      throw new Error(`Choose a configured ${field.label} option.`);
    }
  }
  return result;
}
export function memberTransition(
  previous: GameMembershipStatus | null,
  action: MemberMembershipAction,
  hasIgn: boolean,
  active: boolean,
): GameMembershipStatus {
  if (action === "leave" && previous) return "left";
  if (action === "withdraw" && previous === "applying") return "interested";
  if (!active) throw new Error("This game is inactive.");
  if (action === "interest" && (!previous || previous === "interested" || previous === "left"))
    return "interested";
  if (action === "apply" && (!previous || ["interested", "applying", "left"].includes(previous))) {
    if (!hasIgn) throw new Error("Save a game profile with an IGN before applying.");
    return "applying";
  }
  throw new Error("This membership transition is not permitted.");
}
