import { createHmac, timingSafeEqual } from "node:crypto";

export type SessionPrincipal =
  | { kind: "member"; memberId: string }
  | { kind: "admin"; adminId: string; username: string };
export const SESSION_MAX_AGE = { member: 60 * 60 * 24 * 7, admin: 60 * 60 * 8 } as const;

export function requireSessionSecret(secret = process.env.SESSION_SECRET): string {
  if (!secret || secret.length < 32) {
    throw new Error("Server SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function sign(body: string, secret: string): Buffer {
  return createHmac("sha256", requireSessionSecret(secret)).update(body).digest();
}

export function sealPrincipal(
  principal: SessionPrincipal,
  secret = requireSessionSecret(),
  now = Math.floor(Date.now() / 1000),
): string {
  const body = Buffer.from(
    JSON.stringify({ ...principal, v: 1, iat: now, exp: now + SESSION_MAX_AGE[principal.kind] }),
  ).toString("base64url");
  return `${body}.${sign(body, secret).toString("base64url")}`;
}

export function unsealPrincipal(
  token: string | undefined,
  kind: SessionPrincipal["kind"],
  secret = requireSessionSecret(),
  now = Math.floor(Date.now() / 1000),
): SessionPrincipal | null {
  requireSessionSecret(secret);
  if (!token || token.length > 2048) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
    const [body, signature] = parts;
    const expected = sign(body, secret);
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      value.v !== 1 ||
      value.kind !== kind ||
      !Number.isInteger(value.iat) ||
      !Number.isInteger(value.exp) ||
      value.iat > now ||
      value.exp <= now ||
      value.exp - value.iat !== SESSION_MAX_AGE[kind]
    )
      return null;
    if (kind === "member" && typeof value.memberId === "string" && value.memberId.length > 0)
      return { kind, memberId: value.memberId };
    if (
      kind === "admin" &&
      typeof value.adminId === "string" &&
      value.adminId.length > 0 &&
      typeof value.username === "string" &&
      value.username.length > 0
    )
      return { kind, adminId: value.adminId, username: value.username };
    return null;
  } catch {
    return null;
  }
}
