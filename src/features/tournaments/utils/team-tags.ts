export function buildTeamTagMap(
  teams: Array<{ name: string; tag: string }>,
): Map<string, string> {
  return new Map(teams.map((team) => [team.name, team.tag]));
}

export function withTeamTags<T extends { team: string }>(
  entries: T[],
  teamTags?: Map<string, string>,
): (T & { tag?: string })[] {
  if (!teamTags?.size) return entries;
  return entries.map((entry) => ({
    ...entry,
    tag: teamTags.get(entry.team),
  }));
}

export function teamDisplayAbbr(name: string, tag?: string): string {
  if (tag) return tag.slice(0, 3).toUpperCase();
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
