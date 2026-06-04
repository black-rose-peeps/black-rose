/**
 * Admin Console session — stored in localStorage for the current tab/browser.
 *
 * In production this would be backed by Supabase Auth (email+password for admin
 * accounts). For now it uses a simple in-memory credential store that is seeded
 * with mock admin accounts and updated whenever a new Admin member is registered
 * through the Members panel.
 */

const SESSION_KEY = "br_admin_session";

// ---------------------------------------------------------------------------
// Credential store (in-memory, persists for the page lifetime)
// ---------------------------------------------------------------------------

/** username → plain-text password (mock only — never do this in production) */
const credentialStore = new Map<string, string>();

/** Seed a mock admin account so you can log in immediately. */
credentialStore.set("admin", "blackrose2026");

/**
 * Register a new admin credential when a member with role "Admin" is created.
 * The password is stored in-memory only and is wiped on page refresh (mock behaviour).
 */
export function registerAdminCredential(username: string, password: string): void {
  credentialStore.set(username.toLowerCase(), password);
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export function isAdminConsoleAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(SESSION_KEY);
}

/**
 * Attempt to log in with the given credentials.
 * Returns `true` on success, `false` on failure.
 */
export function loginAdminConsole(username: string, password: string): boolean {
  const stored = credentialStore.get(username.trim().toLowerCase());
  if (!stored || stored !== password) return false;
  localStorage.setItem(SESSION_KEY, username.trim().toLowerCase());
  return true;
}

export function logoutAdminConsole(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getAdminConsoleUser(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}
