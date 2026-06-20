import { isAndroidDevice, isDiscordPhoneOrTablet } from "@/lib/device";

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
      if (parsed.pathname !== "/") {
        return `discord://-${parsed.pathname}${parsed.search}`;
      }
    }
  } catch {
    // Fall through to the original URL.
  }
  return httpsUrl;
}

/**
 * Desktop-only handoff URL for Discord app deep links.
 * Discord intentionally does not support account OAuth via discord:// on mobile —
 * see https://github.com/discord/discord-api-docs/discussions/7259
 */
export function getDiscordDesktopHandoffUrl(httpsUrl: string): string {
  const appUrl = toDiscordAppUrl(httpsUrl);
  return isDiscordAppUrl(appUrl) ? appUrl : httpsUrl;
}

/** True when the URL points at Discord (https invite, channel, user profile, etc.). */
export function isDiscordHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
    return isHttp && (host === "discord.com" || host === "discord.gg");
  } catch {
    return false;
  }
}

/** True when the URL can be handed off to the Discord desktop/mobile app. */
export function isDiscordAppUrl(url: string): boolean {
  return url.startsWith("discord://");
}

/** Account OAuth must stay in the mobile browser — Discord does not deep-link these flows. */
export function shouldUseBrowserOAuthOnMobile(): boolean {
  return isDiscordPhoneOrTablet();
}

/**
 * Open a non-OAuth Discord link in the desktop app from a user gesture.
 * Do not use for account OAuth on mobile.
 */
export function openDiscordAppFromUserGesture(httpsUrl: string): void {
  if (typeof window === "undefined") return;

  if (shouldUseBrowserOAuthOnMobile()) {
    window.location.assign(httpsUrl);
    return;
  }

  const handoffUrl = getDiscordDesktopHandoffUrl(httpsUrl);
  if (!isDiscordAppUrl(handoffUrl)) {
    window.location.assign(httpsUrl);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = handoffUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/** @deprecated Prefer openDiscordAppFromUserGesture inside a click handler. */
export function openDiscordApp(httpsUrl: string): void {
  openDiscordAppFromUserGesture(httpsUrl);
}

/** Open the https://discord.com page or invite in the browser. */
export function openDiscordInBrowser(httpsUrl: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(httpsUrl);
}

/** @deprecated Use openDiscordAppFromUserGesture */
export function launchDiscordDesktopApp(httpsUrl: string): void {
  openDiscordAppFromUserGesture(httpsUrl);
}

/** @deprecated Use openDiscordAppFromUserGesture */
export function openDiscordLink(httpsUrl: string): void {
  openDiscordAppFromUserGesture(httpsUrl);
}

/** Resolve href for invite/channel links — platform-specific handoff. */
export function getDiscordLinkHandoff(httpsUrl: string): { href: string; openInNewTab: boolean } {
  const appUrl = toDiscordAppUrl(httpsUrl);

  // Mobile: https URLs open the Discord app via universal/app links (reliable).
  // discord:// in a new tab often leaves an empty browser tab.
  if (isDiscordPhoneOrTablet()) {
    return { href: httpsUrl, openInNewTab: false };
  }

  if (isDiscordAppUrl(appUrl)) {
    return { href: appUrl, openInNewTab: true };
  }

  return { href: httpsUrl, openInNewTab: true };
}

/** @deprecated Unused on mobile OAuth */
export { isAndroidDevice };
