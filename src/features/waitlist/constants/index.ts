export const WAITLIST_TEMPLATES = [
  {
    game: "Valorant",
    accent: "text-red-400",
    fields: [
      "IGN:",
      "Rank:",
      "Nationality:",
      "Invited by / Referred by:",
      "Streaming Page: (optional)",
    ],
  },
  {
    game: "Other Games",
    accent: "text-muted-foreground",
    fields: [
      "Game:",
      "IGN:",
      "UID (if applicable):",
      "Rank:",
      "Nationality:",
      "Invited by / Referred by:",
      "Streaming Page: (optional)",
    ],
  },
] as const;
