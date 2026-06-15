/** Shared Discord bot / verification env configuration (server-only). */

export function getDiscordBotToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN?.trim() || null;
}

export function getDiscordGuildId(): string | null {
  return process.env.DISCORD_GUILD_ID?.trim() || null;
}

export function getConfiguredRoseRoleId(): string | null {
  return process.env.DISCORD_ROSE_ROLE_ID?.trim() || null;
}

export function getConfiguredRoseRoleName(): string {
  return process.env.DISCORD_ROSE_ROLE_NAME?.trim() || "ROSE";
}

export function isDiscordRoleSyncConfigured(): boolean {
  return Boolean(getDiscordBotToken() && getDiscordGuildId());
}
