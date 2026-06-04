/** Internal auth email for admin console login (not used for real email). */
export function adminAuthEmail(username: string): string {
  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
  if (!normalized)
    throw new Error("Invalid username: cannot be empty or contain only special characters.");
  return `${normalized}@blackrose.admin`;
}
