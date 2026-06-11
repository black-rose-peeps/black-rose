const RIOT_CALLBACK_PATH = "/auth/riot/callback";

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** Riot RSO redirect URIs accepted from the browser / server functions. */
export function isAllowedRiotRedirectUri(uri: string): boolean {
  const url = parseUrl(uri);
  if (!url || url.pathname !== RIOT_CALLBACK_PATH) return false;

  if (url.hostname === "localhost" && (url.protocol === "http:" || url.protocol === "https:")) {
    return true;
  }

  return url.protocol === "https:";
}

/** Build the Riot RSO callback URL for the current browser origin. */
export function getRiotRedirectUri(): string {
  if (typeof window === "undefined") {
    throw new Error("getRiotRedirectUri() must run in the browser.");
  }

  const redirectUri = `${window.location.origin}${RIOT_CALLBACK_PATH}`;
  if (!isAllowedRiotRedirectUri(redirectUri)) {
    throw new Error("This site URL is not allowed for Riot account linking.");
  }

  return redirectUri;
}
