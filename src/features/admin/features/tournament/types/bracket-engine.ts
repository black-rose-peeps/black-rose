/**
 * Professional Bracket Engine
 * Handles bracket generation, team validation, and automatic positioning
 */

export interface BracketMatch {
  matchId: string;
  roundNumber: number;
  matchNumber: number;
  teamA: string | null;
  teamB: string | null;
  scoreA: number | "";
  scoreB: number | "";
  winner: string | null;
  confirmed: boolean;
  // Bracket relationships
  nextMatchId: string | null;
  nextMatchSlot: "teamA" | "teamB" | null;
  // Positioning
  position: {
    x: number;
    y: number;
  };
}

export interface BracketRound {
  roundNumber: number;
  roundName: string;
  matches: BracketMatch[];
}

export interface BracketStructure {
  totalTeams: number;
  totalRounds: number;
  rounds: BracketRound[];
}

export interface TeamAssignmentError {
  type: "duplicate" | "invalid" | "missing";
  message: string;
  matchId?: string;
}

export interface BracketValidation {
  isValid: boolean;
  errors: TeamAssignmentError[];
  canPublish: boolean;
}

/**
 * Professional Bracket Engine Class
 */
export class BracketEngine {
  private structure: BracketStructure;
  private teamPool: string[];

  constructor(teams: string[]) {
    this.teamPool = teams;
    this.structure = this.generateBracketStructure(teams.length);
  }

  /**
   * Generate bracket structure with proper relationships and positioning
   */
  private generateBracketStructure(teamCount: number): BracketStructure {
    const size = Math.pow(2, Math.ceil(Math.log2(Math.max(teamCount, 2))));
    const totalRounds = Math.log2(size);

    const rounds: BracketRound[] = [];

    // Generate rounds from first to final
    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
      const matchesInRound = size / Math.pow(2, roundNum);
      const roundName = this.getRoundName(roundNum, totalRounds);

      const matches: BracketMatch[] = [];

      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        const matchId = `r${roundNum}-m${matchNum}`;

        // Calculate next match relationships
        let nextMatchId: string | null = null;
        let nextMatchSlot: "teamA" | "teamB" | null = null;

        if (roundNum < totalRounds) {
          const nextRoundMatchNum = Math.ceil(matchNum / 2);
          nextMatchId = `r${roundNum + 1}-m${nextRoundMatchNum}`;
          nextMatchSlot = matchNum % 2 === 1 ? "teamA" : "teamB";
        }

        // Calculate positioning
        const position = this.calculatePosition(roundNum, matchNum, totalRounds, size);

        const match: BracketMatch = {
          matchId,
          roundNumber: roundNum,
          matchNumber: matchNum,
          teamA: null,
          teamB: null,
          scoreA: "",
          scoreB: "",
          winner: null,
          confirmed: false,
          nextMatchId,
          nextMatchSlot,
          position,
        };

        matches.push(match);
      }

      rounds.push({
        roundNumber: roundNum,
        roundName,
        matches,
      });
    }

    return {
      totalTeams: size,
      totalRounds,
      rounds,
    };
  }

  /**
   * Calculate automatic positioning for match cards
   */
  private calculatePosition(
    roundNum: number,
    matchNum: number,
    totalRounds: number,
    bracketSize: number,
  ): { x: number; y: number } {
    // Constants for positioning
    const CARD_WIDTH = 256;
    const CARD_HEIGHT = 112;
    const ROUND_SPACING = 320;
    const BASE_VERTICAL_SPACING = 160;

    // X position: rounds are spaced horizontally
    const x = (roundNum - 1) * ROUND_SPACING;

    // Y position: matches are vertically centered relative to feeder matches
    const matchesInRound = bracketSize / Math.pow(2, roundNum);
    const verticalSpacing = BASE_VERTICAL_SPACING * Math.pow(2, roundNum - 1);

    // Center vertically within available space, add sufficient offset to prevent cutoff
    const totalHeight = (matchesInRound - 1) * verticalSpacing;
    const startY = Math.max(40, -totalHeight / 2 + 120); // Add 120px offset from top for proper clearance
    const y = startY + (matchNum - 1) * verticalSpacing;

    return { x, y };
  }

  /**
   * Get round name based on position in bracket
   */
  private getRoundName(roundNum: number, totalRounds: number): string {
    const remainingRounds = totalRounds - roundNum + 1;

    if (remainingRounds === 1) return "Grand Final";
    if (remainingRounds === 2) return "Semifinals";
    if (remainingRounds === 3) return "Quarterfinals";
    if (remainingRounds === 4) return "Round of 16";
    return `Round ${roundNum}`;
  }

  /**
   * Auto-seed teams into first round
   */
  autoSeed(teams: string[]): void {
    const firstRound = this.structure.rounds[0];

    for (let i = 0; i < firstRound.matches.length && i * 2 < teams.length; i++) {
      const match = firstRound.matches[i];
      match.teamA = teams[i * 2] || null;
      match.teamB = teams[i * 2 + 1] || null;
      match.winner = null;
      match.confirmed = false;
    }

    this.advanceWinners();
  }

  /**
   * Manually seed teams with validation
   */
  manualSeed(
    assignments: Array<{ matchId: string; teamA: string | null; teamB: string | null }>,
  ): BracketValidation {
    const errors: TeamAssignmentError[] = [];
    const usedTeams = new Set<string>();

    // Validate assignments
    for (const assignment of assignments) {
      if (assignment.teamA && usedTeams.has(assignment.teamA)) {
        errors.push({
          type: "duplicate",
          message: `Team ${assignment.teamA} is assigned multiple times`,
          matchId: assignment.matchId,
        });
      }
      if (assignment.teamB && usedTeams.has(assignment.teamB)) {
        errors.push({
          type: "duplicate",
          message: `Team ${assignment.teamB} is assigned multiple times`,
          matchId: assignment.matchId,
        });
      }
      if (assignment.teamA === assignment.teamB && assignment.teamA !== null) {
        errors.push({
          type: "invalid",
          message: `Team cannot play against itself`,
          matchId: assignment.matchId,
        });
      }

      if (assignment.teamA) usedTeams.add(assignment.teamA);
      if (assignment.teamB) usedTeams.add(assignment.teamB);
    }

    if (errors.length === 0) {
      // Apply assignments
      const firstRound = this.structure.rounds[0];
      for (const assignment of assignments) {
        const match = firstRound.matches.find((m) => m.matchId === assignment.matchId);
        if (match) {
          match.teamA = assignment.teamA;
          match.teamB = assignment.teamB;
          match.winner = null;
          match.confirmed = false;
        }
      }
      this.advanceWinners();
    }

    return {
      isValid: errors.length === 0,
      errors,
      canPublish: errors.length === 0 && this.validateBracketIntegrity().isValid,
    };
  }

  /**
   * Random seed teams
   */
  randomSeed(teams: string[]): void {
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    this.autoSeed(shuffled);
  }

  /**
   * Update match result and advance winners
   */
  updateMatch(matchId: string, update: Partial<BracketMatch>): BracketValidation {
    const match = this.findMatch(matchId);
    if (!match) {
      return {
        isValid: false,
        errors: [{ type: "invalid", message: "Match not found" }],
        canPublish: false,
      };
    }

    // Apply update
    Object.assign(match, update);

    // Auto-advance winners
    this.advanceWinners();

    return this.validateBracketIntegrity();
  }

  /**
   * Advance confirmed winners to next round
   */
  private advanceWinners(): void {
    for (const round of this.structure.rounds) {
      for (const match of round.matches) {
        if (match.confirmed && match.winner && match.nextMatchId) {
          const nextMatch = this.findMatch(match.nextMatchId);
          if (nextMatch && match.nextMatchSlot) {
            nextMatch[match.nextMatchSlot] = match.winner;
            // Reset next match if it was previously set
            if (!nextMatch.confirmed) {
              nextMatch.winner = null;
              nextMatch.scoreA = "";
              nextMatch.scoreB = "";
            }
          }
        }
      }
    }
  }

  /**
   * Validate entire bracket integrity
   */
  validateBracketIntegrity(): BracketValidation {
    const errors: TeamAssignmentError[] = [];
    const usedTeams = new Set<string>();

    // Check first round for duplicates
    const firstRound = this.structure.rounds[0];
    for (const match of firstRound.matches) {
      if (match.teamA) {
        if (usedTeams.has(match.teamA)) {
          errors.push({
            type: "duplicate",
            message: `Team ${match.teamA} appears multiple times`,
            matchId: match.matchId,
          });
        }
        usedTeams.add(match.teamA);
      }
      if (match.teamB) {
        if (usedTeams.has(match.teamB)) {
          errors.push({
            type: "duplicate",
            message: `Team ${match.teamB} appears multiple times`,
            matchId: match.matchId,
          });
        }
        usedTeams.add(match.teamB);
      }
      if (match.teamA === match.teamB && match.teamA !== null) {
        errors.push({
          type: "invalid",
          message: "Team cannot play against itself",
          matchId: match.matchId,
        });
      }
    }

    // Check that all first round slots are filled
    const emptySlots = firstRound.matches.some((m) => m.teamA === null || m.teamB === null);
    if (emptySlots) {
      errors.push({
        type: "missing",
        message: "All first round matches must have teams assigned",
      });
    }

    const isValid = errors.length === 0;
    const canPublish = isValid && firstRound.matches.every((m) => m.teamA && m.teamB);

    return { isValid, errors, canPublish };
  }

  /**
   * Get available teams for a specific match (excludes already assigned teams)
   */
  getAvailableTeams(excludeMatchId?: string): string[] {
    const assignedTeams = new Set<string>();

    // Collect all assigned teams except from the excluded match
    const firstRound = this.structure.rounds[0];
    for (const match of firstRound.matches) {
      if (match.matchId !== excludeMatchId) {
        if (match.teamA) assignedTeams.add(match.teamA);
        if (match.teamB) assignedTeams.add(match.teamB);
      }
    }

    return this.teamPool.filter((team) => !assignedTeams.has(team));
  }

  /**
   * Reset bracket to initial state
   */
  reset(): void {
    for (const round of this.structure.rounds) {
      for (const match of round.matches) {
        match.teamA = null;
        match.teamB = null;
        match.scoreA = "";
        match.scoreB = "";
        match.winner = null;
        match.confirmed = false;
      }
    }
  }

  /**
   * Find match by ID
   */
  private findMatch(matchId: string): BracketMatch | null {
    for (const round of this.structure.rounds) {
      const match = round.matches.find((m) => m.matchId === matchId);
      if (match) return match;
    }
    return null;
  }

  /**
   * Get bracket structure
   */
  getBracketStructure(): BracketStructure {
    return this.structure;
  }

  /**
   * Get team initials/tag for display
   */
  getTeamDisplayName(teamName: string | null, mode: "full" | "initials" = "full"): string {
    if (!teamName) return "";

    if (mode === "initials") {
      // Extract initials or use first 3 characters
      const words = teamName.split(" ");
      if (words.length > 1) {
        return words
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 3);
      }
      return teamName.slice(0, 3).toUpperCase();
    }

    return teamName;
  }
}
