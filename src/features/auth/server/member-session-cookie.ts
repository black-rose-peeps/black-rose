export const MEMBER_SESSION_COOKIE = "br_member_id";

export function parseMemberSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== MEMBER_SESSION_COOKIE) continue;
    const value = rest.join("=").trim();
    return value ? decodeURIComponent(value) : null;
  }

  return null;
}
