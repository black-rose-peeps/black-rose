import type { TournamentGame } from "./index";

/** Team rosters vs direct individual registration. */
export type ParticipationType = "team" | "solo";

/** Where Winds Meet competition style (only when game is WWM). */
export type WwmMode = "1v1_arena" | "group_strategy";

export const WWM_MODE_OPTIONS: { value: WwmMode; label: string; description: string }[] = [
  {
    value: "1v1_arena",
    label: "1v1 Arena",
    description: "Individual players register directly — one entrant per slot.",
  },
  {
    value: "group_strategy",
    label: "Group Strategy",
    description: "Teams register with full rosters for squad-based play.",
  },
];

export function resolveParticipationType(
  game: TournamentGame,
  wwmMode?: WwmMode | null,
): ParticipationType {
  if (game === "Teamfight Tactics") return "solo";
  if (game === "Where Winds Meet" && wwmMode === "1v1_arena") return "solo";
  return "team";
}

export function isSoloTournament(tournament: { participationType?: ParticipationType }): boolean {
  return tournament.participationType === "solo";
}

export function defaultWwmModeForGame(game: TournamentGame): WwmMode | null {
  return game === "Where Winds Meet" ? "group_strategy" : null;
}

export function participationTypeLabel(type: ParticipationType): string {
  return type === "solo" ? "Individual" : "Team";
}

export function wwmModeLabel(mode: WwmMode | null | undefined): string | null {
  if (!mode) return null;
  return WWM_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? null;
}

export function registrationCapLabel(type: ParticipationType): string {
  return type === "solo" ? "Player Cap" : "Team Cap";
}
