const DISCORD_CALLBACK_PATH = "/auth/callback";

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Discord OAuth redirect URIs we accept from the browser / server function.
 * Uses the live site URL — no env var needed. Discord still requires each URL
 * to be registered in the Developer Portal.
 */
export function isAllowedDiscordRedirectUri(uri: string): boolean {
  const url = parseUrl(uri);
  if (!url || url.pathname !== DISCORD_CALLBACK_PATH) return false;

  if (url.hostname === "localhost" && (url.protocol === "http:" || url.protocol === "https:")) {
    return true;
  }

  return url.protocol === "https:";
}

/** Build the OAuth callback URL for the current browser origin. */
export function getDiscordRedirectUri(): string {
  if (typeof window === "undefined") {
    throw new Error("getDiscordRedirectUri() must run in the browser.");
  }

  const redirectUri = `${window.location.origin}${DISCORD_CALLBACK_PATH}`;
  if (!isAllowedDiscordRedirectUri(redirectUri)) {
    throw new Error("This site URL is not allowed for Discord sign-in.");
  }

  return redirectUri;
}
