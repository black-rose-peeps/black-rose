export function normalizeValorantTagline(tagline: string): string {
  return tagline.trim().replace(/^#/, "");
}

export function formatValorantRiotId(gameName: string, tagline: string): string | null {
  const name = gameName.trim();
  const tag = normalizeValorantTagline(tagline);
  if (!name || !tag) return null;
  return `${name}#${tag}`;
}

export function hasValorantIdentity(gameName: string, tagline: string): boolean {
  return formatValorantRiotId(gameName, tagline) !== null;
}

export function resolveValorantCompetitiveName(
  gameName: string,
  tagline: string,
  fallbackDisplayName: string,
): string {
  return formatValorantRiotId(gameName, tagline) ?? fallbackDisplayName;
}

export function isValorantGame(game: string): boolean {
  return game === "Valorant";
}

export function validateValorantIdentityInput(
  gameName: string,
  tagline: string,
): string | null {
  const name = gameName.trim();
  const tag = normalizeValorantTagline(tagline);

  if (!name && !tag) return null;
  if (!name || !tag) return "Enter both your Valorant IGN and tagline.";

  if (name.length > 16) return "IGN must be 16 characters or fewer.";
  if (name.includes("#")) return "IGN should not include # — use the tagline field.";
  if (!/^[a-zA-Z0-9 ]+$/.test(name)) {
    return "IGN can only contain letters, numbers, and spaces.";
  }

  if (tag.length < 3 || tag.length > 5) return "Tagline must be 3–5 characters.";
  if (!/^[a-zA-Z0-9]+$/.test(tag)) return "Tagline can only contain letters and numbers.";

  return null;
}
