import {
  isDoubleEliminationFormat,
  isSingleEliminationFormat,
} from "../constants/formats";
import type { RuleSection, TournamentGame } from "../types";

export interface TournamentRulesOptions {
  game?: TournamentGame;
  teamCap?: number;
}

function baseEligibility(game: TournamentGame | undefined, teamCap: number | undefined): RuleSection {
  const rosterSize =
    game === "League of Legends"
      ? "5 starters and up to 2 substitutes (7 total)"
      : game === "Teamfight Tactics"
        ? "1 player per team"
        : "5 starters and up to 2 substitutes (7 total)";

  return {
    title: "Eligibility",
    items: [
      "All players must be registered Black Rose members.",
      `Each team must field a valid roster (${rosterSize}).`,
      "Players may not compete for more than one team in the same tournament.",
      teamCap
        ? `Registration is capped at ${teamCap} teams; slots are first-come, first-served once approved.`
        : "Registration slots are filled on a first-come, first-served basis once approved.",
      "Age requirement: 16 years or older.",
    ],
  };
}

function singleEliminationBracketRules(teamCap?: number): RuleSection {
  const teamNote = teamCap
    ? `This event runs a ${teamCap}-team single-elimination bracket (power-of-two field).`
    : "This event runs a single-elimination bracket.";

  return {
    title: "Bracket — Single Elimination",
    items: [
      teamNote,
      "One match loss eliminates your team from the tournament.",
      "Seeding is set by tournament staff before the bracket is published.",
      "Winners advance to the next round; the bracket path is fixed once published.",
      "Default match format is Best of 3 (BO3) unless a round is marked otherwise on the bracket.",
      "BO1 rounds require one map win; BO3 requires two map wins; BO5 requires three map wins.",
      "TBD slots are filled automatically as earlier matches are decided.",
    ],
  };
}

function doubleEliminationBracketRules(teamCap?: number): RuleSection {
  const teamNote = teamCap
    ? `This event runs a ${teamCap}-team double-elimination bracket.`
    : "This event runs a double-elimination bracket.";

  return {
    title: "Bracket — Double Elimination",
    items: [
      teamNote,
      "All teams begin in the upper bracket.",
      "An upper-bracket loss drops your team into the lower bracket — you are not eliminated yet.",
      "A second loss (in the lower bracket) eliminates your team.",
      "Lower bracket path: Lower Round 1 → Lower Round 2 → Lower Semifinals → Lower Final.",
      "The upper-bracket winner and lower-bracket winner meet in the Grand Final.",
      "Grand Final is a single championship match unless staff announce a bracket-reset policy before play.",
      "Default match format is Best of 3 (BO3) unless a round is marked otherwise on the bracket.",
      "BO1 rounds require one map win; BO3 requires two map wins; BO5 requires three map wins.",
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

function matchConductRules(game: TournamentGame | undefined): RuleSection {
  const lobbyNote =
    game === "League of Legends"
      ? "Custom games / tournament lobbies must be ready 10 minutes before match time."
      : game === "Teamfight Tactics"
        ? "Players must be in the designated TFT lobby 10 minutes before match time."
        : "Teams must be present in the designated lobby 10 minutes before match time.";

  return {
    title: "Match Conduct",
    items: [
      lobbyNote,
      "A no-show after 15 minutes from the scheduled start results in a forfeit.",
      "Use of cheats, exploits, or unauthorized software results in immediate disqualification.",
      "Respectful conduct toward opponents, staff, and spectators is mandatory.",
      "Substitutions may be made between maps or games, not mid-map, and only from the registered roster.",
    ],
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
  const { game, teamCap } = options;

  let bracketSection: RuleSection;
  if (isDoubleEliminationFormat(format)) {
    bracketSection = doubleEliminationBracketRules(teamCap);
  } else if (isSingleEliminationFormat(format)) {
    bracketSection = singleEliminationBracketRules(teamCap);
  } else {
    bracketSection = genericBracketRules(format);
  }

  return [
    bracketSection,
    baseEligibility(game, teamCap),
    matchConductRules(game),
    disputesRules(),
  ];
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
