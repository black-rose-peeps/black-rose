import type { GameWithRoles } from "@/features/admin/features/games/services/games.service";

export const GAME_MEMBERSHIP_STATUSES = [
  "interested",
  "applying",
  "accepted",
  "inactive",
  "left",
] as const;
export type GameMembershipStatus = (typeof GAME_MEMBERSHIP_STATUSES)[number];
export type GameProfileFieldKey = "class" | "server" | "faction";
export interface GameProfileField {
  enabled: boolean;
  label: string;
  kind: "text" | "select";
  options: string[];
}
export type GameProfileFieldConfig = Partial<Record<GameProfileFieldKey, GameProfileField>>;
export type MembershipGame = GameWithRoles & { profile_field_config?: GameProfileFieldConfig };

export interface MemberGameProfile {
  memberId: string;
  gameId: string;
  ign: string;
  roleId: string | null;
  roleLabel: string;
  className: string;
  serverName: string;
  faction: string;
  updatedAt: string;
}
export interface GameMembership {
  memberId: string;
  gameId: string;
  status: GameMembershipStatus;
  updatedAt: string;
}
export interface GameIdentityLegacy {
  mainGame: string;
  mainRole: string;
  valorantGameName: string;
  valorantTagline: string;
  gameIdentities: Record<string, string>;
  ingameDisplayName: string;
}
export interface MemberGameWorkspace {
  games: MembershipGame[];
  profiles: MemberGameProfile[];
  memberships: GameMembership[];
  legacy: GameIdentityLegacy;
}
export interface SaveGameProfileInput {
  gameId: string;
  ign: string;
  roleId: string | null;
  className: string;
  serverName: string;
  faction: string;
}
export type MemberMembershipAction = "interest" | "apply" | "withdraw" | "leave";
export interface GameRosterEntry {
  memberId: string;
  displayName: string;
  discordUsername: string;
  mainGame: string;
  verificationStatus: string;
  profile: MemberGameProfile | null;
  membership: GameMembership | null;
}
export interface GameRosterInput {
  gameId: string;
  status?: GameMembershipStatus;
  roleId?: string;
  className?: string;
  serverName?: string;
  faction?: string;
}
