/**
 * User verification roles.
 *
 * Flow:
 *   not_verified → (admin reviews & briefs the user) → verified
 *
 * - "not_verified" : Registered via Discord but not yet approved by an admin.
 *                    Lands on /waitlist after registration.
 * - "verified"     : Admin has manually set this role. Full platform access.
 * - "admin"        : Tournament administrator. Access to /admin console.
 */
export type UserRole = "not_verified" | "verified" | "admin";

export interface AppUser {
  /** Black Rose member row ID (Supabase UUID) */
  id: string;
  /** Discord user snowflake ID — always a string per Discord API */
  discordId: string;
  username: string;
  /** Display name from Discord global_name, falls back to username */
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  role: UserRole;
  /** ISO timestamp of when the account was created in our system */
  registeredAt: string;
  /** Public profile slug — used for /members/:slug links */
  profileSlug?: string;
}
