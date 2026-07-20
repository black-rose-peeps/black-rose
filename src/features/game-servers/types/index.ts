export interface PalworldServerStatus {
  id: string;
  /** Short display name — last word of the full server name */
  name: string;
  /** Full server name from /info.servername */
  fullName: string;
  /** True if the server responded within the timeout */
  online: boolean;
  currentPlayers: number;
  maxPlayers: number;
  /** Server uptime in seconds */
  uptime: number;
  /** In-game world day count */
  days: number;
  /** Server version string */
  version: string;
}

export interface PalworldServersResult {
  servers: PalworldServerStatus[];
  fetchedAt: string; // ISO timestamp
}

/** Key server settings returned by GET /settings */
export interface PalworldServerSettings {
  Difficulty: string;
  ServerName: string;
  ServerDescription: string;
  AdminPassword: string; // intentionally omitted from public display — kept for type completeness
  ServerPassword: string; // same — omit from display
  PublicPort: number;
  PublicIP: string;
  RCONEnabled: boolean;
  RCONPort: number;
  RESTAPIEnabled: boolean;
  RESTAPIPort: number;
  Region: string;
  // Base camp
  BaseCampMaxNum: number;
  BaseCampWorkerMaxNum: number;
  /** Max Palboxes per guild */
  BaseCampMaxNumInGuild: number;
  /** Auto-reset guild timer when no online players (hours) */
  AutoResetGuildTimeNoOnlinePlayers: number;
  bAutoResetGuildNoOnlinePlayers: boolean;
  /** Global Palbox export/import permissions */
  bAllowGlobalPalboxExport: boolean;
  bAllowGlobalPalboxImport: boolean;
  // Gameplay multipliers
  ExpRate: number;
  PalCaptureRate: number;
  PalSpawnNumRate: number;
  PalDamageRateAttack: number;
  PalDamageRateDefense: number;
  PlayerDamageRateAttack: number;
  PlayerDamageRateDefense: number;
  PlayerStomachDecreaceRate: number;
  PlayerStaminaDecreaceRate: number;
  PlayerAutoHPRegeneRate: number;
  PlayerAutoHpRegeneRateInSleep: number;
  PalStomachDecreaceRate: number;
  PalStaminaDecreaceRate: number;
  PalAutoHPRegeneRate: number;
  PalAutoHpRegeneRateInSleep: number;
  BuildObjectDamageRate: number;
  BuildObjectDeteriorationDamageRate: number;
  CollectionDropRate: number;
  CollectionObjectHpRate: number;
  CollectionObjectRespawnSpeedRate: number;
  EnemyDropItemRate: number;
  DeathPenalty: string; // e.g. "None", "Item", "ItemAndEquipment", "All"
  bEnablePlayerToPlayerDamage: boolean;
  bEnableFriendlyFire: boolean;
  bEnableInvaderEnemy: boolean;
  DayTimeSpeedRate: number;
  NightTimeSpeedRate: number;
  WorkSpeedRate: number;
  GuildPlayerMaxNum: number;
  PalEggDefaultHatchingTime: number;
  DropItemMaxNum: number;
  ServerPlayerMaxNum: number;
  CoopPlayerMaxNum: number;
  bIsPvP: boolean;
  bIsMultiplay: boolean;
  // Drop-in fields that may or may not be present
  [key: string]: unknown;
}

export interface PalworldServerDetail extends PalworldServerStatus {
  /** Full settings object from GET /settings */
  settings: Partial<PalworldServerSettings> | null;
  /** Server FPS from /metrics */
  serverFps: number;
  /** Server frame time ms from /metrics */
  serverFrameTime: number;
  /** Current base camp count from /metrics */
  basecampNum: number;
  /** Max base camps allowed — from settings.BaseCampMaxNum */
  maxBasecampNum: number;
  /** Max pals per base camp — from settings.BaseCampWorkerMaxNum */
  maxBasePals: number;
}

/** A connected player returned by GET /players (ip field stripped server-side) */
export interface PalworldPlayer {
  name: string;
  accountName: string;
  playerId: string;
  /** Platform-prefixed ID e.g. "steam_..." */
  userId: string;
  ping: number;
  level: number;
  location_x: number;
  location_y: number;
  building_count: number;
}

export interface PalworldPlayersResult {
  players: PalworldPlayer[];
  fetchedAt: string;
}
