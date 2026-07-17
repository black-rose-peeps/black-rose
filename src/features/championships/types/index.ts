export interface ChampionshipTitle {
  tournamentId: string;
  tournamentName: string;
  game: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  /** ISO date when the event concluded (best available). */
  concludedAt: string;
}

export interface ChampionshipIndex {
  /** All recorded first-place finishes, newest first. */
  titles: ChampionshipTitle[];
  /** teamId → titles for that roster */
  byTeamId: Map<string, ChampionshipTitle[]>;
}

/** Public hall-of-champions archive entry — one crown per concluded event. */
export interface HallOfChampionRecord {
  id: string;
  tournamentId: string;
  tournamentName: string;
  game: string;
  region: string;
  format: string;
  participationType: "team" | "solo";
  prizePool: string;
  teamName: string;
  teamTag: string;
  teamId: string | null;
  mvp: string | null;
  /** Crown date — completed_at from archive or tournament start. */
  crownedAt: string;
  /** Official champion pictorial when uploaded; null shows editorial placeholder. */
  portraitUrl: string | null;
  /** Custom editorial copy; auto-generated narrative when absent. */
  story: string | null;
  /** Grand finals vs standard final — best-effort from bracket metadata. */
  crownVariant: "grand" | "final";
  /** Venue type derived from the final round schedule. null = not recorded. */
  venueType: "online" | "onsite" | null;
  /** Physical address when venueType is onsite. */
  venueLocation: string | null;
}
