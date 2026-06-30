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
  /** When set, event-specific policies live in the uploaded official rules document. */
  hasOfficialRuleset?: boolean;
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

function officialRulesNote(hasOfficialRuleset?: boolean): string {
  return hasOfficialRuleset
    ? "Round formats shown on the Bracket tab reflect staff settings; full match policies are in the official ruleset."
    : "Round formats (BO1/BO3/BO5) are shown on the Bracket tab once staff publish the bracket.";
}

function registrationRules(options: TournamentRulesOptions): RuleSection {
  const { teamCap } = options;
  const solo = isSoloRules(options);
  const label = slotLabel(solo);

  const items = [
    solo
      ? "All entrants must be registered Black Rose members."
      : "All players must be registered Black Rose members.",
    solo
      ? "Each member may register only once for this event."
      : "Each player may compete for only one team in this tournament.",
    teamCap
      ? `Registration is capped at ${teamCap} ${label}; slots are filled first-come, first-served once approved.`
      : `Registration slots are filled on a first-come, first-served basis once approved.`,
  ];

  if (options.hasOfficialRuleset) {
    items.push(
      "Age limits, roster size, substitutes, and other eligibility requirements are defined in the official ruleset.",
    );
  }

  return {
    title: "Registration",
    items,
  };
}

function singleEliminationBracketRules(
  teamCap: number | undefined,
  solo: boolean,
  hasOfficialRuleset?: boolean,
): RuleSection {
  const label = slotLabel(solo);
  const teamNote = teamCap
    ? `This event runs a ${teamCap}-${label.slice(0, -1)} single-elimination bracket.`
    : "This event runs a single-elimination bracket.";

  const items = [
    teamNote,
    solo
      ? "One match loss eliminates you from the tournament."
      : "One match loss eliminates your team from the tournament.",
    "Seeding is set by tournament staff before the bracket is published.",
    "Winners advance to the next round; the bracket path is fixed once published.",
    "TBD slots are filled automatically as earlier matches are decided.",
    officialRulesNote(hasOfficialRuleset),
  ];

  if (!hasOfficialRuleset) {
    items.splice(
      4,
      0,
      "Default match format is Best of 3 (BO3) unless a round is marked otherwise on the bracket.",
    );
  }

  return {
    title: "Bracket — Single Elimination",
    items,
  };
}

function doubleEliminationBracketRules(
  teamCap: number | undefined,
  solo: boolean,
  hasOfficialRuleset?: boolean,
): RuleSection {
  const label = slotLabel(solo);
  const teamNote = teamCap
    ? `This event runs a ${teamCap}-${label.slice(0, -1)} double-elimination bracket.`
    : "This event runs a double-elimination bracket.";

  const items = [
    teamNote,
    solo ? "All players begin in the upper bracket." : "All teams begin in the upper bracket.",
    solo
      ? "An upper-bracket loss drops you into the lower bracket — you are not eliminated yet."
      : "An upper-bracket loss drops your team into the lower bracket — you are not eliminated yet.",
    solo
      ? "A second loss (in the lower bracket) eliminates you."
      : "A second loss (in the lower bracket) eliminates your team.",
    "The upper-bracket and lower-bracket winners meet in the Grand Final.",
    officialRulesNote(hasOfficialRuleset),
  ];

  if (!hasOfficialRuleset) {
    items.splice(
      5,
      0,
      "Lower bracket progresses through numbered rounds before the Grand Final on larger fields.",
      "Grand Final is a single championship match unless staff announce a bracket-reset policy before play.",
      "Default match format is Best of 3 (BO3) unless a round is marked otherwise on the bracket.",
    );
  }

  return {
    title: "Bracket — Double Elimination",
    items,
  };
}

function swissBracketRules(
  teamCap: number | undefined,
  solo: boolean,
  hasOfficialRuleset?: boolean,
): RuleSection {
  const label = slotLabel(solo);
  const teamNote = teamCap
    ? `This event runs a ${teamCap}-${label.slice(0, -1)} Swiss-system group stage.`
    : "This event runs a Swiss-system group stage.";

  const items = [
    teamNote,
    solo
      ? "Each round, players are paired against opponents with a similar record."
      : "Each round, teams are paired against opponents with a similar record.",
    solo
      ? "Advancement and elimination thresholds are announced by staff for this event."
      : "Advancement and elimination thresholds are announced by staff for this event.",
    "Final standings are shown on the bracket once results are recorded.",
    officialRulesNote(hasOfficialRuleset),
  ];

  if (!hasOfficialRuleset) {
    items.splice(
      3,
      0,
      solo
        ? "Players that reach 3 wins typically qualify for the playoffs; 3 losses typically eliminate."
        : "Teams that reach 3 wins typically qualify for the playoffs; 3 losses typically eliminate.",
      "Default match format is Best of 3 (BO3) unless a round is marked otherwise on the bracket.",
    );
  }

  return {
    title: "Bracket — Swiss System",
    items,
  };
}

function genericBracketRules(format: string): RuleSection {
  return {
    title: "Bracket Format",
    items: [
      `Competition structure: ${format || "as announced by staff"}.`,
      "Bracket details and live results are published on the Bracket tab once staff lock seeding.",
    ],
  };
}

function platformConductRules(hasOfficialRuleset?: boolean): RuleSection {
  if (hasOfficialRuleset) {
    return {
      title: "Conduct",
      items: [
        "Match scheduling, punctuality, pauses, and in-game conduct are defined in the official ruleset.",
        "Use of cheats, exploits, or unauthorized software is prohibited.",
      ],
    };
  }

  return {
    title: "Conduct",
    items: [
      "Follow staff instructions for match check-in and scheduling.",
      "Use of cheats, exploits, or unauthorized software results in disqualification.",
      "Respectful conduct toward opponents, staff, and spectators is required.",
    ],
  };
}

/** Build public Rules tab content from tournament format (and optional game / cap). */
export function buildTournamentRulesForFormat(
  format: string,
  options: TournamentRulesOptions = {},
): RuleSection[] {
  const { teamCap, hasOfficialRuleset } = options;
  const solo = isSoloRules(options);

  let bracketSection: RuleSection;
  if (isDoubleEliminationFormat(format)) {
    bracketSection = doubleEliminationBracketRules(teamCap, solo, hasOfficialRuleset);
  } else if (isSingleEliminationFormat(format)) {
    bracketSection = singleEliminationBracketRules(teamCap, solo, hasOfficialRuleset);
  } else if (isSwissFormat(format)) {
    bracketSection = swissBracketRules(teamCap, solo, hasOfficialRuleset);
  } else {
    bracketSection = genericBracketRules(format);
  }

  const sections: RuleSection[] = [bracketSection, registrationRules(options)];

  if (!hasOfficialRuleset) {
    sections.push(platformConductRules(false));
  } else {
    sections.push(platformConductRules(true));
  }

  return sections;
}

/**
 * Rules for the public detail page: bracket/registration/conduct are generated from
 * format; optional custom sections are merged without duplicating titles.
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
