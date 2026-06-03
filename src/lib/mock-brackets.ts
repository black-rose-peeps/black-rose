import type { BracketMatch, BracketRound } from "@/features/tournaments/types";

function match(
  id: string,
  round: string,
  teamA: string | null,
  teamB: string | null,
  scoreA?: number,
  scoreB?: number,
  winner?: string,
): BracketMatch {
  return {
    id,
    round,
    teamA,
    teamB,
    scoreA,
    scoreB,
    winner,
  };
}

/** 16-team single elimination + grand final. */
export function buildSingleElimBracket(teamNames: string[]): BracketRound[] {
  const teams = teamNames.slice(0, 16);
  while (teams.length < 16) teams.push(`Open Slot ${teams.length + 1}`);

  const r1: BracketMatch[] = [];
  for (let i = 0; i < 8; i++) {
    r1.push(
      match(
        `se-r1-m${i + 1}`,
        "Round of 16",
        teams[i * 2],
        teams[i * 2 + 1],
        i < 4 ? 2 : undefined,
        i < 4 ? 1 : undefined,
        i < 4 ? teams[i * 2] : undefined,
      ),
    );
  }

  return [
    { label: "Round of 16", matches: r1 },
    {
      label: "Quarterfinals",
      matches: [
        match("se-r2-m1", "Quarterfinals", teams[0], teams[2], 2, 0, teams[0]),
        match("se-r2-m2", "Quarterfinals", teams[4], teams[6]),
        match("se-r2-m3", "Quarterfinals", teams[8], teams[10]),
        match("se-r2-m4", "Quarterfinals", teams[12], teams[14]),
      ],
    },
    {
      label: "Semifinals",
      matches: [
        match("se-r3-m1", "Semifinals", teams[0], teams[4]),
        match("se-r3-m2", "Semifinals", teams[8], teams[12]),
      ],
    },
    {
      label: "Grand Final",
      matches: [match("se-gf-1", "Grand Final", null, null)],
    },
  ];
}

/** 8-team double elimination (upper + lower) + grand final. */
export function buildDoubleElimBracket(teamNames: string[]): BracketRound[] {
  const teams = teamNames.slice(0, 8);
  while (teams.length < 8) teams.push(`Open Slot ${teams.length + 1}`);

  return [
    {
      label: "Upper — Round 1",
      matches: [
        match("de-ub-r1-m1", "Upper R1", teams[0], teams[1], 2, 1, teams[0]),
        match("de-ub-r1-m2", "Upper R1", teams[2], teams[3], 2, 0, teams[2]),
        match("de-ub-r1-m3", "Upper R1", teams[4], teams[5]),
        match("de-ub-r1-m4", "Upper R1", teams[6], teams[7]),
      ],
    },
    {
      label: "Upper — Semifinals",
      matches: [
        match("de-ub-r2-m1", "Upper SF", teams[0], teams[2]),
        match("de-ub-r2-m2", "Upper SF", teams[4], teams[6]),
      ],
    },
    {
      label: "Upper — Final",
      matches: [match("de-ub-f-1", "Upper Final", null, null)],
    },
    {
      label: "Lower — Round 1",
      matches: [
        match("de-lb-r1-m1", "Lower R1", teams[1], teams[3]),
        match("de-lb-r1-m2", "Lower R1", teams[5], teams[7]),
      ],
    },
    {
      label: "Lower — Final",
      matches: [match("de-lb-f-1", "Lower Final", null, null)],
    },
    {
      label: "Grand Final",
      matches: [match("de-gf-1", "Grand Final", null, null)],
    },
  ];
}

export function isGrandFinalRound(round: BracketRound): boolean {
  return /grand\s*final/i.test(round.label);
}

export function splitBracketRounds(bracket: BracketRound[]): {
  main: BracketRound[];
  grandFinals: BracketRound[];
} {
  const grandFinals = bracket.filter(isGrandFinalRound);
  const main = bracket.filter((r) => !isGrandFinalRound(r));
  return { main, grandFinals };
}
