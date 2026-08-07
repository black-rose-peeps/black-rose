export type CommunityTab = "overview" | "events" | "servers" | "guilds";

export const TABS: { key: CommunityTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "events", label: "Past Events" },
  { key: "servers", label: "Game Servers" },
  { key: "guilds", label: "Game Guilds" },
];
