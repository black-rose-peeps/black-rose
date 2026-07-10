const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID?.trim() ?? "";
const NATIVE_CALLBACK_PATH = "/authorize/callback";

export function getDiscordNativeRedirectUri(): string {
  if (!DISCORD_CLIENT_ID) {
    throw new Error(
      "VITE_DISCORD_CLIENT_ID is not set. Add it to your .env file from the Discord Developer Portal.",
    );
  }
  return `discord-${DISCORD_CLIENT_ID}:${NATIVE_CALLBACK_PATH}`;
}

export function isDiscordNativeRedirectUri(uri: string): boolean {
  if (!DISCORD_CLIENT_ID) return false;
  const prefix = `discord-${DISCORD_CLIENT_ID}:`;
  if (!uri.startsWith(prefix)) return false;
  const pathAndQuery = uri.slice(prefix.length);
  return (
    pathAndQuery === NATIVE_CALLBACK_PATH ||
    pathAndQuery.startsWith(`${NATIVE_CALLBACK_PATH}?`)
  );
}
