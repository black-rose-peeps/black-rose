import type { MockPlayer, MockTeam, MockTournament } from "@/lib/mock-data";

const STATUS_SORT = ["Approved", "Pending", "Previously Competed", "Rejected"] as const;

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(",");
}

function slugifyFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function formatSimpleDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.trim();
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

function sortRegistrations(registrations: MockTeam[]): MockTeam[] {
  return [...registrations].sort((a, b) => {
    const statusA = STATUS_SORT.indexOf(a.status as (typeof STATUS_SORT)[number]);
    const statusB = STATUS_SORT.indexOf(b.status as (typeof STATUS_SORT)[number]);
    const rankA = statusA === -1 ? STATUS_SORT.length : statusA;
    const rankB = statusB === -1 ? STATUS_SORT.length : statusB;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function formatPlayerEntry(member: MockPlayer): string {
  const ign = member.ign?.trim() ?? "";
  const discord = member.discord?.trim() ?? "";
  if (ign && discord) return `${ign} — ${discord}`;
  return ign || discord;
}

function formatPlayersColumn(members: MockTeam["members"]): string {
  return members.map(formatPlayerEntry).filter(Boolean).join("; ");
}

export function buildTournamentRegistrationsCsv(
  tournament: MockTournament,
  registrations: MockTeam[],
  soloEvent: boolean,
): string {
  const sorted = sortRegistrations(registrations);
  const lines: string[] = [];

  lines.push(csvRow(["Tournament", tournament.name]));
  lines.push(csvRow(["Exported", formatSimpleDate(new Date().toISOString())]));
  lines.push("");

  if (soloEvent) {
    lines.push(csvRow(["Status", "Player Name", "Tag", "Player", "Date Registered"]));

    for (const registration of sorted) {
      const player = registration.members[0];
      const playerEntry = player
        ? formatPlayerEntry(player)
        : formatPlayerEntry({
            ign: registration.name,
            role: "",
            discord: registration.captain,
          });

      lines.push(
        csvRow([
          registration.status,
          registration.name,
          registration.tag,
          playerEntry,
          formatSimpleDate(registration.registrationDate),
        ]),
      );
    }
  } else {
    lines.push(
      csvRow([
        "Status",
        "Team Name",
        "Tag",
        "Captain",
        "Date Registered",
        "Players (IGN — Discord)",
      ]),
    );

    for (const registration of sorted) {
      lines.push(
        csvRow([
          registration.status,
          registration.name,
          registration.tag,
          registration.captain,
          formatSimpleDate(registration.registrationDate),
          formatPlayersColumn(registration.members),
        ]),
      );
    }
  }

  return `${lines.join("\r\n")}\r\n`;
}

export function downloadTournamentRegistrationsCsv(
  tournament: MockTournament,
  registrations: MockTeam[],
  soloEvent: boolean,
): void {
  const content = buildTournamentRegistrationsCsv(tournament, registrations, soloEvent);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${slugifyFilename(tournament.name) || "tournament"}-registrations-${dateStamp}.csv`;
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
