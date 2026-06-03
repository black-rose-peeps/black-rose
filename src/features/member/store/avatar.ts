/**
 * Client-side avatar store — frontend placeholder.
 *
 * Persists the user's uploaded avatar data URL to localStorage so it
 * survives page refresh. Replace with a real upload endpoint
 * (POST /api/profile/avatar → returns a CDN URL) when the backend is ready.
 */

const AVATAR_KEY = "br_avatar";

export function getSavedAvatar(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AVATAR_KEY);
}

export function saveAvatar(dataUrl: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AVATAR_KEY, dataUrl);
}

export function removeAvatar(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AVATAR_KEY);
}
