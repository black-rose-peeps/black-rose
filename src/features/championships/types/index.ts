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
