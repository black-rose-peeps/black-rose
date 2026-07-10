import {
  bracketCapacity,
  byeCount,
  openingPlayableMatchCount,
  usesCompressedPreliminaryField,
} from "@/features/admin/features/tournament-details/utils/bracket-field";

/** How teams are assigned to seed numbers before bracket generation. */
export type SeedingFormat = "committee" | "tier" | "protected_random" | "random";

export type SeedingTier = "elite" | "contender" | "open";

export const DEFAULT_SEEDING_FORMAT: SeedingFormat = "committee";

export const SEEDING_FORMAT_OPTIONS: ReadonlyArray<{
  value: SeedingFormat;
  label: string;
  description: string;
}> = [
  {
    value: "committee",
    label: "Committee ranked",
    description: "Staff assigns seed order manually — seed 1 is strongest.",
  },
  {
    value: "tier",
    label: "Tier-based",
    description: "Group teams into Elite, Contender, and Open tiers, then auto-rank seeds.",
  },
  {
    value: "protected_random",
    label: "Protected top seeds + random",
    description: "Rank the top seeds manually, then randomly fill the remaining slots.",
  },
  {
    value: "random",
    label: "Random draw",
    description: "Shuffle all teams into seed slots — blind draw.",
  },
];

export const SEEDING_TIER_OPTIONS: ReadonlyArray<{
  value: SeedingTier;
  label: string;
}> = [
  { value: "elite", label: "Elite" },
  { value: "contender", label: "Contender" },
  { value: "open", label: "Open" },
];

export function defaultProtectedSeedCount(teamCount: number): number {
  const byes = byeCount(teamCount);
  if (byes > 0) return byes;
  if (teamCount <= 8) return Math.floor(teamCount / 2);
  return Math.min(8, Math.floor(teamCount / 2));
}

export function protectedSeedCountOptions(teamCount: number): number[] {
  const defaults = new Set<number>(
    [4, defaultProtectedSeedCount(teamCount), Math.floor(teamCount / 2)].filter(
      (n) => n >= 2 && n < teamCount,
    ),
  );
  return [...defaults].sort((a, b) => a - b);
}

function shuffleTeams<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function buildRegistrationOrderAssignments<T extends { id: string }>(
  teams: T[],
): Array<T | null> {
  return teams.map((team) => team);
}

export function buildRandomSeedingAssignments<T extends { id: string }>(
  teams: T[],
): Array<T | null> {
  return shuffleTeams(teams);
}

export function buildTierSeedingAssignments<T extends { id: string }>(
  teams: T[],
  tierByTeamId: Record<string, SeedingTier | undefined>,
): Array<T | null> {
  const elite = teams.filter((team) => tierByTeamId[team.id] === "elite");
  const contender = teams.filter((team) => tierByTeamId[team.id] === "contender");
  const open = teams.filter((team) => !tierByTeamId[team.id] || tierByTeamId[team.id] === "open");

  return [...elite, ...contender, ...open];
}

export function buildProtectedRandomAssignments<T extends { id: string }>(
  teams: T[],
  currentAssignments: Array<T | null>,
  protectedCount: number,
): Array<T | null> {
  const size = teams.length;
  const clampedProtected = Math.min(Math.max(1, protectedCount), size - 1);
  const next: Array<T | null> = Array(size).fill(null);

  const protectedTeams: T[] = [];
  for (let i = 0; i < clampedProtected; i++) {
    const team = currentAssignments[i] ?? null;
    next[i] = team;
    if (team) protectedTeams.push(team);
  }

  const protectedIds = new Set(protectedTeams.map((team) => team.id));
  const pool = teams.filter((team) => !protectedIds.has(team.id));
  const shuffled = shuffleTeams(pool);

  let poolIndex = 0;
  for (let i = clampedProtected; i < size; i++) {
    next[i] = shuffled[poolIndex++] ?? null;
  }

  return next;
}

export interface SeedingReadinessInput<T extends { id: string }> {
  format: SeedingFormat;
  teams: T[];
  assignments: Array<T | null>;
  tierByTeamId: Record<string, SeedingTier | undefined>;
  protectedSeedCount: number;
}

export interface SeedingReadinessResult {
  ready: boolean;
  title: string;
  description: string;
}

function clampedProtectedCount(teamCount: number, protectedSeedCount: number): number {
  return Math.min(Math.max(1, protectedSeedCount), Math.max(1, teamCount - 1));
}

function unregisteredTeamFailure(): SeedingReadinessResult {
  return {
    ready: false,
    title: "Unregistered team",
    description:
      "A seeded team is no longer registered. Remove it from seeding or refresh the team list.",
  };
}

/** Whether the admin can click Generate Bracket for the selected seeding format. */
export function validateSeedingReadiness<T extends { id: string }>(
  input: SeedingReadinessInput<T>,
): SeedingReadinessResult {
  const { format, teams, assignments, protectedSeedCount } = input;
  const teamCount = teams.length;
  const registeredIds = new Set(teams.map((team) => team.id));

  if (teamCount < 2) {
    return {
      ready: false,
      title: "Not enough teams",
      description: "At least two teams are required to generate a bracket.",
    };
  }

  switch (format) {
    case "committee": {
      const assigned = assignments.slice(0, teamCount);
      const ids = new Set<string>();
      for (let i = 0; i < teamCount; i++) {
        const team = assigned[i];
        if (!team) {
          return {
            ready: false,
            title: "Seeding incomplete",
            description: `Assign all ${teamCount} teams to seed slots 1–${teamCount} before generating.`,
          };
        }
        if (!registeredIds.has(team.id)) {
          return unregisteredTeamFailure();
        }
        if (ids.has(team.id)) {
          return {
            ready: false,
            title: "Duplicate team",
            description: "Each team can only occupy one seed slot in committee seeding.",
          };
        }
        ids.add(team.id);
      }
      return { ready: true, title: "", description: "" };
    }
    case "tier":
      return { ready: true, title: "", description: "" };
    case "protected_random": {
      const protectedCount = clampedProtectedCount(teamCount, protectedSeedCount);
      const ids = new Set<string>();
      for (let i = 0; i < protectedCount; i++) {
        const team = assignments[i];
        if (!team) {
          return {
            ready: false,
            title: "Protected seeds incomplete",
            description: `Assign teams to protected seeds 1–${protectedCount} before generating. Remaining seeds are filled randomly on generate.`,
          };
        }
        if (!registeredIds.has(team.id)) {
          return unregisteredTeamFailure();
        }
        if (ids.has(team.id)) {
          return {
            ready: false,
            title: "Duplicate team",
            description: "Each protected seed slot must have a unique team.",
          };
        }
        ids.add(team.id);
      }
      return { ready: true, title: "", description: "" };
    }
    case "random":
      return { ready: true, title: "", description: "" };
  }
}

/**
 * Apply the selected seeding format when generating the bracket.
 * Committee uses the current manual order; other formats derive assignments here.
 */
export function resolveSeedingAssignments<T extends { id: string }>(
  input: SeedingReadinessInput<T>,
): Array<T | null> {
  const { format, teams, assignments, tierByTeamId, protectedSeedCount } = input;

  switch (format) {
    case "committee":
      return assignments.slice(0, teams.length);
    case "tier":
      return buildTierSeedingAssignments(teams, tierByTeamId);
    case "protected_random":
      return buildProtectedRandomAssignments(teams, assignments, protectedSeedCount);
    case "random":
      return buildRandomSeedingAssignments(teams);
  }
}

export function seedingFormatDescription(
  format: SeedingFormat,
  teamCount: number,
  protectedCount: number,
): string {
  const capacity = bracketCapacity(teamCount);
  const byes = byeCount(teamCount);
  const byeNote =
    byes > 0
      ? usesCompressedPreliminaryField(teamCount)
        ? ` Top ${byes} seeds skip to round two; ${openingPlayableMatchCount(teamCount)} opening matches on a ${capacity}-slot tree.`
        : ` Top ${byes} seeds receive round-one byes on a ${capacity}-slot tree.`
      : "";

  switch (format) {
    case "committee":
      return `Assign seeds 1–${teamCount} manually. Bracket paths follow standard ${capacity}-slot placement.${byeNote}`;
    case "tier":
      return `Elite teams receive the highest seeds, then Contender, then Open. Tier order is applied when you generate the bracket.${byeNote}`;
    case "protected_random":
      return `Rank seeds 1–${protectedCount} manually, then remaining seeds are randomized on generate.${byeNote}`;
    case "random":
      return `All teams are shuffled into seed slots when you generate the bracket.${byeNote}`;
  }
}
