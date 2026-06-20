const DISCORD_CALLBACK_PATH = "/auth/callback";

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

/** Local / LAN hosts used with `vite --host` during mobile dev testing. */
function isPrivateDevHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (isLoopbackHost(host) || host.endsWith(".local")) {
    return true;
  }

  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  return false;
}

function readEnvDiscordRedirectUri(): string | null {
  const value = import.meta.env.VITE_DISCORD_REDIRECT_URI?.trim();
  if (!value) return null;
  return value;
}

/**
 * Discord OAuth redirect URIs we accept from the browser / server function.
 * Uses the live site URL — no env var needed. Discord still requires each URL
 * to be registered in the Discord Developer Portal.
 */
export function isAllowedDiscordRedirectUri(uri: string): boolean {
  const url = parseUrl(uri);
  if (!url || url.pathname !== DISCORD_CALLBACK_PATH) return false;

  const configured = readEnvDiscordRedirectUri();
  if (configured && uri === configured) {
    return (
      url.protocol === "https:" || (url.protocol === "http:" && isPrivateDevHost(url.hostname))
    );
  }

  if (url.protocol === "http:" && isPrivateDevHost(url.hostname)) {
    return true;
  }

  return url.protocol === "https:";
}

/** True when OAuth uses VITE_DISCORD_REDIRECT_URI instead of window.location.origin. */
export function usesEnvDiscordRedirectUri(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const configured = readEnvDiscordRedirectUri();
    if (!configured) return false;
    return getDiscordRedirectUri() === configured;
  } catch {
    return false;
  }
}

/**
 * OAuth would redirect to localhost/127.0.0.1 but this device is not the dev machine.
 * Common when VITE_DISCORD_REDIRECT_URI=http://localhost:… while testing on a phone.
 */
export function isDiscordRedirectUnreachableOnDevice(): boolean {
  if (typeof window === "undefined") return false;

  const configured = readEnvDiscordRedirectUri();
  if (!configured) return false;

  const configuredUrl = parseUrl(configured);
  if (!configuredUrl || !isLoopbackHost(configuredUrl.hostname)) return false;

  return !isLoopbackHost(window.location.hostname);
}

/**
 * Discord may reject raw LAN IPs (192.168.x.x) at the token step even when listed in the portal.
 * Prefer an HTTPS tunnel for mobile dev — see .env.example.
 */
export function isDiscordRejectedLanRedirectUri(): boolean {
  if (typeof window === "undefined") return false;
  if (isDiscordRedirectUnreachableOnDevice()) return false;

  let redirectUri: string;
  try {
    redirectUri = getDiscordRedirectUri();
  } catch {
    return false;
  }

  const url = parseUrl(redirectUri);
  if (!url || url.protocol !== "http:") return false;

  const host = url.hostname.toLowerCase();
  return isPrivateDevHost(host) && !isLoopbackHost(host);
}

/** Browsing a LAN IP while VITE_DISCORD_REDIRECT_URI points at an HTTPS tunnel. */
export function isDiscordTunnelEnvMismatch(): boolean {
  if (typeof window === "undefined") return false;

  const configured = readEnvDiscordRedirectUri();
  if (!configured?.startsWith("https://")) return false;

  const configuredOrigin = parseUrl(configured)?.origin;
  return Boolean(configuredOrigin && window.location.origin !== configuredOrigin);
}

/** Human-readable redirect URI registered for the current OAuth request. */
export function describeDiscordRedirectUri(): string {
  if (typeof window === "undefined") {
    return readEnvDiscordRedirectUri() ?? "(browser origin)/auth/callback";
  }
  try {
    return getDiscordRedirectUri();
  } catch {
    return `${window.location.origin}${DISCORD_CALLBACK_PATH}`;
  }
}

/**
 * Build the OAuth callback URL for the current browser origin.
 * Never returns localhost when the user opened the site on a phone/LAN IP.
 */
export function getDiscordRedirectUri(): string {
  if (typeof window === "undefined") {
    const configured = readEnvDiscordRedirectUri();
    if (configured && isAllowedDiscordRedirectUri(configured)) return configured;
    throw new Error("getDiscordRedirectUri() must run in the browser.");
  }

  const originRedirect = `${window.location.origin}${DISCORD_CALLBACK_PATH}`;
  const configured = readEnvDiscordRedirectUri();

  if (configured && isAllowedDiscordRedirectUri(configured)) {
    const configuredUrl = parseUrl(configured);
    const configuredOrigin = configuredUrl?.origin ?? "";

    if (configured.startsWith("https://")) {
      if (window.location.origin === configuredOrigin) {
        return configured;
      }
      if (isLoopbackHost(window.location.hostname)) {
        return configured;
      }
    }

    if (
      configuredUrl?.protocol === "http:" &&
      isLoopbackHost(configuredUrl.hostname) &&
      isLoopbackHost(window.location.hostname)
    ) {
      return configured;
    }

    if (window.location.origin === configuredOrigin) {
      return configured;
    }
  }

  if (!isAllowedDiscordRedirectUri(originRedirect)) {
    throw new Error("This site URL is not allowed for Discord sign-in.");
  }

  return originRedirect;
}
