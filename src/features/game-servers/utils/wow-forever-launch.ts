import type { Game } from "@/features/admin/features/games/services/games.service";

// Matches the countdown embedded in Blizzard's /en-us/forever launch page.
// November 5, 2026 at 07:00 in the Philippines (UTC+08:00).
export const WOW_FOREVER_LAUNCH_AT = "2026-11-04T23:00:00.000Z";
export const WOW_FOREVER_LAUNCH_MS = Date.parse(WOW_FOREVER_LAUNCH_AT);
export const WOW_FOREVER_PAGE_PATH = "/community/wow-forever";
export const WOW_FOREVER_ANNOUNCEMENT_URL =
  "https://www.facebook.com/story.php?story_fbid=122143611513152669&id=61584580077731#";

export interface LaunchCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function getWoWForeverEmbedUrl(width: number): string {
  const query = new URLSearchParams({
    href: WOW_FOREVER_ANNOUNCEMENT_URL,
    show_text: "true",
    width: String(Math.floor(Math.min(500, Math.max(350, width)))),
  });
  return `https://www.facebook.com/plugins/post.php?${query}`;
}

export function isWoWForever(game: Pick<Game, "slug" | "name">): boolean {
  const slug = game.slug.trim().toLowerCase();
  const name = game.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    slug === "world-of-warcraft-forever" ||
    slug === "wow-forever" ||
    name === "worldofwarcraftforever" ||
    name === "wowforever"
  );
}

/** Expiry is absolute, not a decrementing counter that drifts in sleeping tabs. */
export function getWoWForeverCountdown(now: number): LaunchCountdown | null {
  if (!Number.isFinite(now) || now >= WOW_FOREVER_LAUNCH_MS) return null;
  const remaining = Math.ceil((WOW_FOREVER_LAUNCH_MS - now) / 1000);
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  };
}
