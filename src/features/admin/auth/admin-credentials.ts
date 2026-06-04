/** Internal auth email for admin console login (not used for real email). */
export function adminAuthEmail(username: string): string {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${normalized}@blackrose.admin`;
}
