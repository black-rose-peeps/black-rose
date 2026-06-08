import type { UserRole } from "../types";

export function hasFullMemberAccess(role: UserRole): boolean {
  return role === "verified" || role === "admin";
}

/** Where Discord auth should send the user based on verification role. */
export function getPostAuthPath(role: UserRole): "/dashboard" | "/waitlist" {
  return hasFullMemberAccess(role) ? "/dashboard" : "/waitlist";
}
