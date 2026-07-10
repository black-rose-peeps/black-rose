import { isTrustedAppHost } from "@/lib/site-meta";
import { isDiscordNativeRedirectUri } from "@/lib/discord-mobile-oauth";

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

function normalizeSiteHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/** www vs apex on the same registered domain (e.g. blackrose.asia). */
function areRelatedAppOrigins(originA: string, originB: string): boolean {
  const a = parseUrl(originA);
  const b = parseUrl(originB);
  if (!a || !b || a.protocol !== b.protocol) return false;
  if (a.origin === b.origin) return true;

  const hostA = normalizeSiteHost(a.hostname);
  const hostB = normalizeSiteHost(b.hostname);
  if (hostA !== hostB) return false;

  return hostA === "blackrose.asia" || hostA.endsWith(".blackrose.asia");
}

/**
 * Discord OAuth redirect URIs we accept from the browser / server function.
 * Uses the live site URL — no env var needed. Discord still requires each URL
 * to be registered in the Discord Developer Portal.
 */
export function isAllowedDiscordRedirectUri(uri: string): boolean {
  if (isDiscordNativeRedirectUri(uri)) return true;

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

  if (url.protocol === "https:" && isTrustedAppHost(url.hostname)) {
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

/**
 * Browsing a LAN HTTP URL while VITE_DISCORD_REDIRECT_URI points at an HTTPS tunnel/production URL.
 * Does not apply to production hosts (blackrose.asia, dev.blackrose.asia, *.vercel.app).
 */
export function isDiscordTunnelEnvMismatch(): boolean {
  if (typeof window === "undefined") return false;

  const configured = readEnvDiscordRedirectUri();
  if (!configured?.startsWith("https://")) return false;

  const configuredOrigin = parseUrl(configured)?.origin;
  if (!configuredOrigin || window.location.origin === configuredOrigin) return false;
  if (areRelatedAppOrigins(window.location.origin, configuredOrigin)) return false;

  if (isTrustedAppHost(window.location.hostname)) return false;

  return (
    window.location.protocol === "http:" && isPrivateDevHost(window.location.hostname)
  );
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
  const configuredUrl = configured ? parseUrl(configured) : null;
  const configuredOrigin = configuredUrl?.origin ?? "";

  if (
    isTrustedAppHost(window.location.hostname) &&
    isAllowedDiscordRedirectUri(originRedirect)
  ) {
    return originRedirect;
  }

  if (configured && isAllowedDiscordRedirectUri(configured)) {
    if (
      window.location.origin === configuredOrigin ||
      areRelatedAppOrigins(window.location.origin, configuredOrigin)
    ) {
      return configured;
    }

    if (configured.startsWith("https://") && isLoopbackHost(window.location.hostname)) {
      return configured;
    }

    if (
      configuredUrl?.protocol === "http:" &&
      isLoopbackHost(configuredUrl.hostname) &&
      isLoopbackHost(window.location.hostname)
    ) {
      return configured;
    }
  }

  if (!isAllowedDiscordRedirectUri(originRedirect)) {
    throw new Error("This site URL is not allowed for Discord sign-in.");
  }

  return originRedirect;
}
