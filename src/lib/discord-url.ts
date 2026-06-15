/** Convert a https://discord.com (or discord.gg) URL into a discord:// deep link. */
export function toDiscordAppUrl(httpsUrl: string): string {
  try {
    const parsed = new URL(httpsUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "discord.gg") {
      const code = parsed.pathname.replace(/^\//, "");
      if (code) return `discord://-/invite/${code}`;
    }

    if (host === "discord.com") {
      const inviteMatch = parsed.pathname.match(/^\/invite\/([^/]+)/);
      if (inviteMatch?.[1]) {
        return `discord://-/invite/${inviteMatch[1]}`;
      }
      return `discord://${host}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Fall through to the original URL.
  }
  return httpsUrl;
}

/** True when the URL can be handed off to the Discord desktop/mobile app. */
export function isDiscordAppUrl(url: string): boolean {
  return url.startsWith("discord://");
}

/**
 * Open a Discord link in the desktop/mobile app.
 * Uses a native anchor click (target=_blank) so the browser keeps this page
 * and reliably hands off discord:// to the OS — works better than location.href.
 */
export function openDiscordApp(httpsUrl: string): void {
  if (typeof window === "undefined") return;

  const appUrl = toDiscordAppUrl(httpsUrl);
  if (!isDiscordAppUrl(appUrl)) {
    openDiscordInBrowser(httpsUrl);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = appUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/** Open the https://discord.com page or invite in the browser. */
export function openDiscordInBrowser(httpsUrl: string): void {
  if (typeof window === "undefined") return;
  window.open(httpsUrl, "_blank", "noopener,noreferrer");
}

/** @deprecated Use openDiscordApp */
export function launchDiscordDesktopApp(httpsUrl: string): void {
  openDiscordApp(httpsUrl);
}

/** @deprecated Use openDiscordInBrowser */
export function openDiscordLink(httpsUrl: string): void {
  openDiscordApp(httpsUrl);
}
