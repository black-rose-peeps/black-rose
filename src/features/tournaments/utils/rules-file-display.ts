export function rulesFileDisplayName(rulesUrl?: string | null): string {
  if (!rulesUrl) return "Official ruleset";
  try {
    const pathname = new URL(rulesUrl).pathname;
    const segment = pathname.split("/").pop() ?? "official-rules";
    return decodeURIComponent(segment.split("?")[0] ?? segment);
  } catch {
    return "Official ruleset";
  }
}
