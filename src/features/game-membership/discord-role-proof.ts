/** Public identifiers only. Keep Discord snowflakes as strings. */
export const DISCORD_GAME_GUILD_ID = "1193921905795792906";
export const DISCORD_GAME_ROLE_MAPPINGS = [
  {
    label: "WoW Forever",
    roleId: "1548977405069234256",
    slugs: ["world-of-warcraft-forever", "wow-forever"],
  },
  { label: "Aion 2", roleId: "1547101455125577789", slugs: ["aion-2"] },
  { label: "Valorant", roleId: "1465129387182522450", slugs: ["valorant"] },
  { label: "Palworld", roleId: "1475345886434295898", slugs: ["palworld"] },
  { label: "League of Legends", roleId: "1465128743726219287", slugs: ["league-of-legends"] },
  { label: "Marvel Rivals", roleId: "1331615176784482306", slugs: ["marvel-rivals"] },
  { label: "Where Winds Meet", roleId: "1439483814182129695", slugs: ["where-winds-meet"] },
] as const;

export interface DiscordRoleObservation {
  discord_id: string;
  role_ids: string[];
  observed_at: string;
  not_in_guild: boolean;
}
export class DiscordRoleProofError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "DiscordRoleProofError";
  }
}
export function isDiscordGameMembershipEnabled(value: string | undefined): boolean {
  return value === "true";
}
export function assertDiscordGameMembershipTarget(config: {
  supabaseUrl: string;
  expectedProjectRef: string | undefined;
  guildId: string | undefined;
}): void {
  const ref = config.expectedProjectRef;
  if (!ref || !/^[a-z0-9]{20}$/.test(ref))
    throw new Error("An explicit Discord membership project reference is required.");
  const url = new URL(config.supabaseUrl);
  if (
    url.origin !== `https://${ref}.supabase.co` ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("Discord membership project target mismatch; no sync was performed.");
  if (config.guildId !== DISCORD_GAME_GUILD_ID)
    throw new Error("Discord membership guild target mismatch.");
}

const snowflake = (value: unknown): value is string =>
  typeof value === "string" && /^\d{17,20}$/.test(value);
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Fresh member proofs, coalesced concurrent reads, bounded metadata cache. No database calls. */
export function createDiscordRoleProofReader(config: {
  token: string;
  guildId: string;
  fetcher?: typeof fetch;
  onRequest?: () => void;
}) {
  if (!config.token || config.guildId !== DISCORD_GAME_GUILD_ID)
    throw new DiscordRoleProofError(
      "Discord membership bot/guild configuration is missing or invalid.",
    );
  const fetcher = config.fetcher ?? fetch;
  let metadataUntil = 0;
  let metadataPending: Promise<void> | null = null;
  let metadataPendingEpoch = -1;
  let memberReadEpoch = 0;
  const pending = new Map<string, Promise<DiscordRoleObservation>>();

  async function request(path: string) {
    config.onRequest?.();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetcher(`https://discord.com/api/v10${path}`, {
        redirect: "error",
        headers: {
          Authorization: `Bot ${config.token}`,
          "User-Agent": "BlackRoseArena (https://blackrose.asia, 1.0.0)",
        },
        signal: controller.signal,
      });
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new DiscordRoleProofError(
          "Discord returned an invalid role response.",
          response.status,
        );
      }
      if (response.status === 429) {
        const delay = record(body).retry_after;
        throw new DiscordRoleProofError(
          "Discord role checks are rate limited; retry later.",
          429,
          typeof delay === "number" && Number.isFinite(delay) && delay > 0
            ? Math.ceil(delay * 1000)
            : undefined,
        );
      }
      return { response, body };
    } catch (error) {
      if (error instanceof DiscordRoleProofError) throw error;
      throw new DiscordRoleProofError("Discord role check is temporarily unavailable.");
    } finally {
      clearTimeout(timeout);
    }
  }
  async function metadata(force = false): Promise<void> {
    if (!force && Date.now() < metadataUntil) return;
    // A forced confirmation must begin after the member snapshots it validates.
    const epoch = memberReadEpoch;
    if (metadataPending && (!force || metadataPendingEpoch === epoch)) return metadataPending;
    const task = (async () => {
      const { response, body } = await request(`/guilds/${config.guildId}/roles`);
      if (!response.ok || !Array.isArray(body) || !body.every((role) => snowflake(record(role).id)))
        throw new DiscordRoleProofError(
          "Discord guild roles could not be verified.",
          response.status,
        );
      const roles = new Set(body.map((role) => record(role).id));
      if (DISCORD_GAME_ROLE_MAPPINGS.some((mapping) => !roles.has(mapping.roleId)))
        throw new DiscordRoleProofError(
          "A configured Discord game role is missing. No membership changes were performed.",
        );
      metadataUntil = Date.now() + 300_000;
    })();
    metadataPending = task;
    metadataPendingEpoch = epoch;
    try {
      await task;
    } finally {
      if (metadataPending === task) metadataPending = null;
    }
  }
  async function readFresh(discordId: string): Promise<DiscordRoleObservation> {
    await metadata();
    const observed = new Date().toISOString();
    const { response, body } = await request(`/guilds/${config.guildId}/members/${discordId}`);
    if (response.status === 404 && record(body).code === 10007) {
      memberReadEpoch++;
      return { discord_id: discordId, role_ids: [], observed_at: observed, not_in_guild: true };
    }
    if (!response.ok)
      throw new DiscordRoleProofError(
        "Discord guild member could not be verified.",
        response.status,
      );
    const member = record(body);
    if (
      record(member.user).id !== discordId ||
      !Array.isArray(member.roles) ||
      !member.roles.every(snowflake) ||
      new Set(member.roles).size !== member.roles.length
    )
      throw new DiscordRoleProofError(
        "Discord returned an incomplete or mismatched member role snapshot.",
        response.status,
      );
    memberReadEpoch++;
    return {
      discord_id: discordId,
      role_ids: [...member.roles],
      observed_at: observed,
      not_in_guild: false,
    };
  }
  return {
    async read(discordId: string): Promise<DiscordRoleObservation> {
      if (!snowflake(discordId))
        throw new DiscordRoleProofError("Invalid linked Discord user identifier.");
      const existing = pending.get(discordId);
      if (existing) return existing;
      const task = readFresh(discordId);
      pending.set(discordId, task);
      try {
        return await task;
      } finally {
        pending.delete(discordId);
      }
    },
    /** Revalidate role existence after the batch, before accepting negative role evidence. */
    confirmMappings: () => metadata(true),
  };
}
