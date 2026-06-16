const DISCORD_API = "https://discord.com/api/v10";
const USER_AGENT = "BlackRoseArena-DiscordSync/1.0";

interface GuildRole {
  id: string;
  name: string;
}

export async function resolveRoseRoleId(env: {
  DISCORD_BOT_TOKEN: string;
  DISCORD_GUILD_ID: string;
  DISCORD_ROSE_ROLE_ID?: string;
  DISCORD_ROSE_ROLE_NAME?: string;
}): Promise<string> {
  const configured = env.DISCORD_ROSE_ROLE_ID?.trim();
  if (configured) return configured;

  const roleName = env.DISCORD_ROSE_ROLE_NAME?.trim() || "ROSE";
  const response = await discordBotFetch(env.DISCORD_BOT_TOKEN, `/guilds/${env.DISCORD_GUILD_ID}/roles`);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord roles lookup failed (${response.status}): ${detail}`);
  }

  const roles = (await response.json()) as GuildRole[];
  const match = roles.find(
    (role) => role.name.localeCompare(roleName, undefined, { sensitivity: "accent" }) === 0,
  );

  if (!match) {
    throw new Error(
      `ROSE role "${roleName}" not found. Set DISCORD_ROSE_ROLE_ID on the Worker.`,
    );
  }

  return match.id;
}

/** Returns role IDs, or null when the user is not in the guild. */
export async function fetchGuildMemberRoleIds(
  token: string,
  guildId: string,
  discordUserId: string,
): Promise<string[] | null> {
  const response = await discordBotFetch(
    token,
    `/guilds/${guildId}/members/${discordUserId}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (response.status === 429) {
    const body = (await response.json()) as { retry_after?: number };
    const waitMs = Math.ceil((body.retry_after ?? 1) * 1000) + 50;
    await sleep(waitMs);
    return fetchGuildMemberRoleIds(token, guildId, discordUserId);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord member lookup failed (${response.status}): ${detail}`);
  }

  const member = (await response.json()) as { roles?: string[] };
  return member.roles ?? [];
}

async function discordBotFetch(token: string, path: string): Promise<Response> {
  return fetch(`${DISCORD_API}${path}`, {
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": USER_AGENT,
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
