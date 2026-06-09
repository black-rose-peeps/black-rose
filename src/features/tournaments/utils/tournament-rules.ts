import {
  isDoubleEliminationFormat,
  isSingleEliminationFormat,
  isSwissFormat,
} from "../constants/formats";
import type { ParticipationType, WwmMode } from "../types/participation";
import type { RuleSection, TournamentGame } from "../types";

export interface TournamentRulesOptions {
  game?: TournamentGame;
  /** Bracket field size (even team cap). */
  teamCap?: number;
  participationType?: ParticipationType;
  wwmMode?: WwmMode | null;
}

/** Bracket field size for rules copy (matches even team cap / approved count). */
export function bracketFieldSize(approvedTeamCount: number): number | undefined {
  if (approvedTeamCount < 2) return undefined;
  return approvedTeamCount;
}

function isSoloRules(options: TournamentRulesOptions): boolean {
  return options.participationType === "solo";
}

function slotLabel(solo: boolean): string {
  return solo ? "players" : "teams";
}

function baseEligibility(options: TournamentRulesOptions): RuleSection {
  const { game, teamCap, wwmMode } = options;
  const solo = isSoloRules(options);

  if (solo) {
    const modeNote =
      game === "Where Winds Meet" && wwmMode === "1v1_arena"
        ? "This is a Where Winds Meet 1v1 Arena event — each entrant competes individually."
        : game === "Teamfight Tactics"
          ? "This is an individual TFT event — one registered member per slot."
          : "This event uses individual registration — one player per slot.";

    return {
      title: "Eligibility",
      items: [
        "All entrants must be registered Black Rose members.",
        modeNote,
        "Players may not register more than once or compete under multiple entries in the same tournament.",
        "Players may not be active in another live or upcoming Black Rose event at the same time.",
        teamCap
          ? `Registration is capped at ${teamCap} players; slots are first-come, first-served once approved.`
          : "Registration slots are filled on a first-come, first-served basis once approved.",
        "Age requirement: 16 years or older.",
      ],
    };
  }

  const rosterSize =
    game === "League of Legends"
      ? "5 starters and up to 2 substitutes (7 total)"
      : game === "Where Winds Meet" && wwmMode === "group_strategy"
        ? "5 starters and up to 2 substitutes (7 total)"
        : "5 starters and up to 2 substitutes (7 total)";

  const modeNote =
    game === "Where Winds Meet" && wwmMode === "group_strategy"
      ? "This is a Where Winds Meet Group Strategy event — teams register with full rosters."
      : null;

  return {
    title: "Eligibility",
    items: [
      "All players must be registered Black Rose members.",
      ...(modeNote ? [modeNote] : []),
      `Each team must field a valid roster (${rosterSize}).`,
      "Players may not compete for more than one team in the same tournament.",
      teamCap
        ? `Registration is capped at ${teamCap} teams; slots are first-come, first-served once approved.`
        : "Registration slots are filled on a first-come, first-served basis once approved.",
      "Age requirement: 16 years or older.",
    ],
  };
}

function singleEliminationBracketRules(teamCap: number | undefined, solo: boolean): RuleSection {
  const label = slotLabel(solo);
  const teamNote = teamCap
    ? `This event runs a ${teamCap}-${label.slice(0, -1)} single-elimination bracket.`
    : "This event runs a single-elimination bracket.";

  return {
    title: "Bracket — Single Elimination",
    items: [
      teamNote,
      solo
        ? "One match loss eliminates you from the tournament."
        : "One match loss eliminates your team from the tournament.",
      "Seeding is set by tournament staff before the bracket is published.",
      "Winners advance to the next round; the bracket path is fixed once published.",
      "Default match format is Best of 3 (BO3) unless a round is marked otherwise on the bracket.",
      "BO1 rounds require one map win; BO3 requires two map wins; BO5 requires three map wins.",
      "TBD slots are filled automatically as earlier matches are decided.",
    ],
  };
}

function doubleEliminationBracketRules(teamCap: number | undefined, solo: boolean): RuleSection {
  const label = slotLabel(solo);
  const teamNote = teamCap
    ? `This event runs a ${teamCap}-${label.slice(0, -1)} double-elimination bracket.`
    : "This event runs a double-elimination bracket.";

  return {
    title: "Bracket — Double Elimination",
    items: [
      teamNote,
      solo ? "All players begin in the upper bracket." : "All teams begin in the upper bracket.",
      solo
        ? "An upper-bracket loss drops you into the lower bracket — you are not eliminated yet."
        : "An upper-bracket loss drops your team into the lower bracket — you are not eliminated yet.",
      solo
        ? "A second loss (in the lower bracket) eliminates you."
        : "A second loss (in the lower bracket) eliminates your team.",
      "Lower bracket progresses through as many lower rounds as needed (e.g., Lower Round 1, Lower Round 2, …) and culminates in the Lower Semifinals and Lower Final.",
      "The upper-bracket winner and lower-bracket winner meet in the Grand Final.",
      "Grand Final is a single championship match unless staff announce a bracket-reset policy before play.",
      "Default match format is Best of 3 (BO3) unless a round is marked otherwise on the bracket.",
      "BO1 rounds require one map win; BO3 requires two map wins; BO5 requires three map wins.",
    ],
  };
}

function swissBracketRules(teamCap: number | undefined, solo: boolean): RuleSection {
  const label = slotLabel(solo);
  const teamNote = teamCap
    ? `This event runs a ${teamCap}-${label.slice(0, -1)} Swiss-system group stage.`
    : "This event runs a Swiss-system group stage.";

  return {
    title: "Bracket — Swiss System",
    items: [
      teamNote,
      solo
        ? "Each round, players are paired against opponents with the same win–loss record."
        : "Each round, teams are paired against opponents with the same win–loss record.",
      solo
        ? "Players that reach 3 wins qualify for the playoffs."
        : "Teams that reach 3 wins qualify for the playoffs.",
      solo
        ? "Players that reach 3 losses are eliminated from the tournament."
        : "Teams that reach 3 losses are eliminated from the tournament.",
      "Rematches are avoided when possible; staff may adjust pairings for scheduling.",
      "Default match format is Best of 3 (BO3) unless a round is marked otherwise on the bracket.",
      "BO1 rounds require one map win; BO3 requires two map wins; BO5 requires three map wins.",
      "Final standings (playoffs vs eliminated) are shown on the bracket once results are recorded.",
    ],
  };
}

function genericBracketRules(format: string): RuleSection {
  return {
    title: "Bracket Format",
    items: [
      `Competition structure: ${format || "as announced by staff"}.`,
      "Bracket details and live results are published on the Bracket tab once staff lock seeding.",
      "Follow staff instructions for match order and check-in times.",
    ],
  };
}

function matchConductRules(options: TournamentRulesOptions): RuleSection {
  const { game, wwmMode } = options;
  const solo = isSoloRules(options);

  let lobbyNote: string;
  if (solo) {
    if (game === "Teamfight Tactics") {
      lobbyNote = "Players must be in the designated TFT lobby 10 minutes before match time.";
    } else if (game === "Where Winds Meet") {
      lobbyNote =
        "Players must be ready in the designated 1v1 Arena lobby 10 minutes before match time.";
    } else {
      lobbyNote = "Players must be present in the designated lobby 10 minutes before match time.";
    }
  } else if (game === "League of Legends") {
    lobbyNote = "Custom games / tournament lobbies must be ready 10 minutes before match time.";
  } else if (game === "Where Winds Meet" && wwmMode === "group_strategy") {
    lobbyNote = "Teams must be present in the designated Group Strategy lobby 10 minutes before match time.";
  } else {
    lobbyNote = "Teams must be present in the designated lobby 10 minutes before match time.";
  }

  const items = [
    lobbyNote,
    "A no-show after 15 minutes from the scheduled start results in a forfeit.",
    "Use of cheats, exploits, or unauthorized software results in immediate disqualification.",
    "Respectful conduct toward opponents, staff, and spectators is mandatory.",
  ];

  if (!solo) {
    items.push(
      "Substitutions may be made between maps or games, not mid-map, and only from the registered roster.",
    );
  }

  return {
    title: "Match Conduct",
    items,
  };
}

function disputesRules(): RuleSection {
  return {
    title: "Disputes",
    items: [
      "All disputes must be submitted to staff within 10 minutes of the match ending.",
      "Staff decisions are final.",
      "Screenshot or video evidence is required for any disputed call.",
    ],
  };
}

/** Build public Rules tab content from tournament format (and optional game / cap). */
export function buildTournamentRulesForFormat(
  format: string,
  options: TournamentRulesOptions = {},
): RuleSection[] {
  const { teamCap } = options;
  const solo = isSoloRules(options);

  let bracketSection: RuleSection;
  if (isDoubleEliminationFormat(format)) {
    bracketSection = doubleEliminationBracketRules(teamCap, solo);
  } else if (isSingleEliminationFormat(format)) {
    bracketSection = singleEliminationBracketRules(teamCap, solo);
  } else if (isSwissFormat(format)) {
    bracketSection = swissBracketRules(teamCap, solo);
  } else {
    bracketSection = genericBracketRules(format);
  }

  return [bracketSection, baseEligibility(options), matchConductRules(options), disputesRules()];
}

/**
 * Rules for the public detail page: bracket/eligibility/conduct are generated from
 * format; optional custom sections (e.g. Substitutions) are merged without duplicating titles.
 */
export function resolveTournamentRules(
  format: string,
  customRules: RuleSection[],
  options: TournamentRulesOptions = {},
): RuleSection[] {
  const generated = buildTournamentRulesForFormat(format, options);
  if (customRules.length === 0) return generated;

  const generatedTitles = new Set(generated.map((s) => s.title));
  const extra = customRules.filter((s) => !generatedTitles.has(s.title));
  return [...generated, ...extra];
}
