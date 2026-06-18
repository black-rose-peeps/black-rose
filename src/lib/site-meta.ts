/** Stable path for the home / default Open Graph preview image. */
export const OG_IMAGE_PATH = "/og-hero.png";

export const SITE_TAGLINE = "RISE AS ONE";
export const DEFAULT_OG_TITLE = `Black Rose — ${SITE_TAGLINE}`;

const CANONICAL_SITE_ORIGIN = "https://blackrose.asia";

let ssrOriginResolver: (() => string | undefined) | undefined;

/** Server-only: wired from request middleware for host-aware absolute URLs. */
export function registerSsrOriginResolver(resolver: () => string | undefined): void {
  ssrOriginResolver = resolver;
}

function isTrustedHost(host: string): boolean {
  const normalized = host.split(":")[0].toLowerCase();
  if (normalized === "localhost" || normalized === "127.0.0.1") return true;
  if (normalized === "blackrose.asia" || normalized === "www.blackrose.asia") return true;
  if (normalized === "black-rose-six.vercel.app") return true;
  if (normalized.endsWith(".vercel.app")) return true;
  return false;
}

export function resolveSiteOriginFromRequest(request: Request): string {
  const url = new URL(request.url);
  if (!isTrustedHost(url.hostname)) {
    return getSiteOrigin();
  }
  return url.origin.replace(/\/$/, "");
}

/** Canonical site origin for absolute social preview URLs (SSR-safe). */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  const fromRequest = ssrOriginResolver?.();
  if (fromRequest) return fromRequest;

  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.trim().replace(/\/$/, "");
  }

  if (typeof process !== "undefined") {
    const vercel = process.env.VERCEL_URL;
    if (vercel?.trim()) {
      return `https://${vercel.trim().replace(/\/$/, "")}`;
    }
  }

  return CANONICAL_SITE_ORIGIN;
}

export function absoluteUrl(path: string, origin = getSiteOrigin()): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getOgImageUrl(origin = getSiteOrigin()): string {
  return absoluteUrl(OG_IMAGE_PATH, origin);
}

/** Default link preview tags — image-first; no description body. */
export function defaultOgMeta(options?: { title?: string; origin?: string; path?: string }) {
  const origin = options?.origin ?? getSiteOrigin();
  const title = options?.title ?? DEFAULT_OG_TITLE;
  const image = getOgImageUrl(origin);
  const url = absoluteUrl(options?.path ?? "/", origin);

  return [
    { title },
    { property: "og:title", content: title },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: DEFAULT_OG_TITLE },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:image", content: image },
  ];
}
