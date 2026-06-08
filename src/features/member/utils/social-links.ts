import type { SocialLink } from "../types";

/** True when a link has a URL and is marked public. */
export function isSocialLinkPublic(link: SocialLink): boolean {
  return Boolean(link.url?.trim() && link.isPublic);
}

/** Strip private link URLs for anyone who is not the profile owner. */
export function sanitizeSocialLinksForViewer(
  links: SocialLink[],
  isOwner: boolean,
): SocialLink[] {
  if (isOwner) return links;
  return links.map((link) => (link.isPublic ? link : { ...link, url: null }));
}
