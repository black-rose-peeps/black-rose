/** Strip a trailing slash so URL joins stay predictable. */
function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Public site origin used for OAuth redirects and absolute links.
 *
 * Resolution order:
 *  1. VITE_APP_URL — set explicitly in Vercel / .env for production
 *  2. Browser origin — correct at runtime on any deployed domain
 *  3. VERCEL_URL — available during SSR on Vercel builds
 *  4. Local dev fallback
 */
export function getAppOrigin(): string {
  const configured = import.meta.env.VITE_APP_URL as string | undefined;
  if (configured) return trimTrailingSlash(configured);

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:5173";
}

/** Discord OAuth callback — must match the URI registered in the Discord Developer Portal. */
export function getDiscordRedirectUri(): string {
  const configured =
    (typeof window !== "undefined"
      ? import.meta.env.VITE_DISCORD_REDIRECT_URI
      : process.env.VITE_DISCORD_REDIRECT_URI ?? process.env.DISCORD_REDIRECT_URI) ?? "";

  if (configured) return configured;

  return `${getAppOrigin()}/auth/callback`;
}
