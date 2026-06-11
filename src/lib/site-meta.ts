/** Stable path for the home / default Open Graph preview image. */
export const OG_IMAGE_PATH = "/og-hero.png";

const DEFAULT_SITE_ORIGIN = "https://black-rose-six.vercel.app";

/** Canonical site origin for absolute social preview URLs (SSR-safe). */
export function getSiteOrigin(): string {
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

  return DEFAULT_SITE_ORIGIN;
}

export function absoluteUrl(path: string, origin = getSiteOrigin()): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getOgImageUrl(origin = getSiteOrigin()): string {
  return absoluteUrl(OG_IMAGE_PATH, origin);
}

/** Default link preview tags — image-first; no description body. */
export function defaultOgMeta(options?: { title?: string; origin?: string }) {
  const title = options?.title ?? "Black Rose — FIGHT AS ONE";
  const image = getOgImageUrl(options?.origin);

  return [
    { title },
    { property: "og:title", content: title },
    { property: "og:type", content: "website" },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: "Black Rose — FIGHT AS ONE" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:image", content: image },
  ];
}
