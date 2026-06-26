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

function containsDisallowedValorantIdentityChar(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
    if (code >= 0x80 && code <= 0x9f) return true;
    if (code === 0x2028 || code === 0x2029) return true;
  }
  return false;
}

export function validateValorantIdentityInput(gameName: string, tagline: string): string | null {
  const name = gameName.trim();
  const tag = normalizeValorantTagline(tagline);

  if (!name && !tag) return null;
  if (!name || !tag) return "Enter both your Valorant IGN and tagline.";

  if (name.length < 3 || name.length > 16) return "IGN must be 3–16 characters.";
  if (name.includes("#")) return "IGN should not include # — use the tagline field.";
  if (containsDisallowedValorantIdentityChar(name)) {
    return "IGN cannot include line breaks or control characters.";
  }

  if (tag.length < 3 || tag.length > 6) return "Tagline must be 3–6 characters.";
  if (tag.includes("#")) return "Tagline should not include #.";
  if (containsDisallowedValorantIdentityChar(tag)) {
    return "Tagline cannot include line breaks or control characters.";
  }

  return null;
}
