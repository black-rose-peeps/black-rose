// Rich detail data for each tournament (frontend mock only)
import type { TournamentDetail } from "@/features/tournaments/types";

// ── Shared rule sections reused across tournaments ─────────────────────────

const standardRules: import("@/features/tournaments/types").RuleSection[] = [
  {
    title: "Eligibility",
    items: [
      "All players must be registered Black Rose members.",
      "Each team must have a minimum of 5 players and a maximum of 7 (including substitutes).",
      "Players may not compete for more than one team in the same tournament.",
      "Age requirement: 16 years or older.",
    ],
  },
  {
    title: "Match Conduct",
    items: [
      "Teams must be present in the designated lobby 10 minutes before match time.",
      "A no-show after 15 minutes from the scheduled start results in a forfeit.",
      "Use of cheats, exploits, or unauthorized software results in immediate disqualification.",
      "Respectful conduct toward opponents, staff, and spectators is mandatory.",
    ],
  },
  {
    title: "Substitutions",
    items: [
      "Substitutions may be made between maps, not mid-map.",
      "Substitutes must be on the registered roster before the tournament starts.",
    ],
  },
  {
    title: "Disputes",
    items: [
      "All disputes must be submitted to staff within 10 minutes of the match ending.",
      "Staff decisions are final.",
      "Screenshot or video evidence is required for any disputed call.",
    ],
  },
];

// ── Tournament detail records ──────────────────────────────────────────────

export const mockTournamentDetails: Record<string, TournamentDetail> = {
  "vlr-nightfall": {
    id: "vlr-nightfall",
    name: "Valorant Nightfall Cup",
    game: "Valorant",
    status: "Registration Open",
    prizePool: "₱10,000",
    startDate: "2026-06-21",
    registrationDeadline: "2026-06-18",
    teamsRegistered: 14,
    teamCap: 32,
    format: "Double Elimination",
    region: "PH",
    description:
      "The Nightfall Cup is Black Rose's flagship Valorant invitational — a grueling double-elimination battle across two weekends to crown the best squad in the Philippines. Bring your sharpest roster and prove you belong at the top.",
    organizer: "Black Rose Operations",
    contact: "ops@blackrose.gg",
    prizeBreakdown: [
      { place: "1st Place", prize: "₱5,000" },
      { place: "2nd Place", prize: "₱2,500" },
      { place: "3rd–4th Place", prize: "₱1,250 each" },
    ],
    schedule: [
      { phase: "Registration Closes", date: "2026-06-18" },
      { phase: "Group Stage", date: "2026-06-21 – 2026-06-22" },
      { phase: "Quarterfinals", date: "2026-06-27", note: "Top 8 from groups" },
      { phase: "Semifinals", date: "2026-06-28" },
      { phase: "Grand Finals", date: "2026-06-29", note: "Best of 3" },
    ],
    rules: standardRules,
    teams: [
      {
        id: "t-001",
        name: "Novellino eSports",
        tag: "NE",
        captain: "CoyHa",
        seed: 1,
        players: [
          { ign: "CoyHa", role: "Duelist / IGL" },
          { ign: "Chewie", role: "Controller" },
          { ign: "Cent", role: "Initiator" },
          { ign: "Kiraz", role: "Sentinel" },
          { ign: "Ashburn", role: "Flex" },
        ],
      },
      {
        id: "t-002",
        name: "Crimson Halo",
        tag: "CRH",
        captain: "halox",
        seed: 2,
        players: [
          { ign: "halox", role: "IGL" },
          { ign: "sable", role: "Duelist" },
          { ign: "nyx", role: "Controller" },
          { ign: "iris", role: "Initiator" },
          { ign: "drev", role: "Sentinel" },
        ],
      },
      {
        id: "t-006",
        name: "Ash Reapers",
        tag: "ASH",
        captain: "rave",
        players: [
          { ign: "rave", role: "IGL" },
          { ign: "byte", role: "Duelist" },
          { ign: "nova", role: "Sentinel" },
          { ign: "Quamico", role: "Initiator" },
          { ign: "ire", role: "Controller" },
        ],
      },
      {
        id: "t-007",
        name: "Iron Phantom",
        tag: "IPN",
        captain: "zhen",
        players: [
          { ign: "zhen", role: "IGL" },
          { ign: "mael", role: "Duelist" },
          { ign: "cass", role: "Controller" },
          { ign: "ryke", role: "Sentinel" },
          { ign: "orin", role: "Initiator" },
        ],
      },
    ],
    bracket: [
      {
        label: "Quarterfinals",
        matches: [
          {
            id: "qf-1",
            round: "Quarterfinals",
            teamA: "Novellino eSports",
            teamB: "Iron Phantom",
            scoreA: undefined,
            scoreB: undefined,
          },
          {
            id: "qf-2",
            round: "Quarterfinals",
            teamA: "Crimson Halo",
            teamB: "Ash Reapers",
            scoreA: undefined,
            scoreB: undefined,
          },
          { id: "qf-3", round: "Quarterfinals", teamA: null, teamB: null },
          { id: "qf-4", round: "Quarterfinals", teamA: null, teamB: null },
        ],
      },
      {
        label: "Semifinals",
        matches: [
          { id: "sf-1", round: "Semifinals", teamA: null, teamB: null },
          { id: "sf-2", round: "Semifinals", teamA: null, teamB: null },
        ],
      },
      {
        label: "Grand Finals",
        matches: [{ id: "gf-1", round: "Grand Finals", teamA: null, teamB: null }],
      },
    ],
  },

  "cs2-ironveil": {
    id: "cs2-ironveil",
    name: "CS2 Ironveil Open",
    game: "CS2",
    status: "Live",
    prizePool: "₱15,000",
    startDate: "2026-05-30",
    registrationDeadline: "2026-05-25",
    teamsRegistered: 24,
    teamCap: 24,
    format: "GSL + Playoffs",
    region: "APAC",
    description:
      "The Ironveil Open is an APAC-wide CS2 showdown running the battle-tested GSL group format before feeding into a hard single-elimination playoff bracket. 24 squads, one title.",
    organizer: "Black Rose Operations",
    contact: "ops@blackrose.gg",
    prizeBreakdown: [
      { place: "1st Place", prize: "₱7,000" },
      { place: "2nd Place", prize: "₱4,000" },
      { place: "3rd Place", prize: "₱2,500" },
      { place: "4th Place", prize: "₱1,500" },
    ],
    schedule: [
      { phase: "Group Stage — Day 1", date: "2026-05-30" },
      { phase: "Group Stage — Day 2", date: "2026-05-31" },
      { phase: "Quarterfinals", date: "2026-06-06" },
      { phase: "Semifinals", date: "2026-06-07" },
      { phase: "Grand Finals", date: "2026-06-08", note: "Best of 3" },
    ],
    rules: standardRules,
    teams: [
      {
        id: "t-003",
        name: "Silver Wolves",
        tag: "SLW",
        captain: "ghost",
        seed: 1,
        players: [
          { ign: "ghost", role: "AWPer" },
          { ign: "kara", role: "Rifler" },
          { ign: "vesp", role: "Support" },
          { ign: "tael", role: "Lurker" },
          { ign: "mira", role: "IGL" },
        ],
      },
      {
        id: "t-008",
        name: "Steel Verdict",
        tag: "STV",
        captain: "orrin",
        seed: 2,
        players: [
          { ign: "orrin", role: "IGL" },
          { ign: "haze", role: "AWPer" },
          { ign: "lock", role: "Rifler" },
          { ign: "pip", role: "Support" },
          { ign: "wren", role: "Lurker" },
        ],
      },
      {
        id: "t-009",
        name: "Black Circuit",
        tag: "BCT",
        captain: "nero",
        players: [
          { ign: "nero", role: "IGL" },
          { ign: "foss", role: "Rifler" },
          { ign: "lane", role: "AWPer" },
          { ign: "cruz", role: "Support" },
          { ign: "dex", role: "Lurker" },
        ],
      },
      {
        id: "t-010",
        name: "Pale Vanguard",
        tag: "PVG",
        captain: "aset",
        players: [
          { ign: "aset", role: "IGL" },
          { ign: "bren", role: "Rifler" },
          { ign: "colt", role: "AWPer" },
          { ign: "dima", role: "Support" },
          { ign: "evo", role: "Lurker" },
        ],
      },
    ],
    bracket: [
      {
        label: "Quarterfinals",
        matches: [
          {
            id: "qf-1",
            round: "Quarterfinals",
            teamA: "Silver Wolves",
            teamB: "Pale Vanguard",
            scoreA: 16,
            scoreB: 9,
            winner: "Silver Wolves",
          },
          {
            id: "qf-2",
            round: "Quarterfinals",
            teamA: "Steel Verdict",
            teamB: "Black Circuit",
            scoreA: 16,
            scoreB: 14,
            winner: "Steel Verdict",
          },
          { id: "qf-3", round: "Quarterfinals", teamA: null, teamB: null },
          { id: "qf-4", round: "Quarterfinals", teamA: null, teamB: null },
        ],
      },
      {
        label: "Semifinals",
        matches: [
          { id: "sf-1", round: "Semifinals", teamA: "Silver Wolves", teamB: null },
          { id: "sf-2", round: "Semifinals", teamA: "Steel Verdict", teamB: null },
        ],
      },
      {
        label: "Grand Finals",
        matches: [{ id: "gf-1", round: "Grand Finals", teamA: null, teamB: null }],
      },
    ],
  },

  "mlbb-ironclad": {
    id: "mlbb-ironclad",
    name: "MLBB Ironclad Series",
    game: "MLBB",
    status: "Live",
    prizePool: "₱9,500",
    startDate: "2026-06-02",
    registrationDeadline: "2026-05-28",
    teamsRegistered: 12,
    teamCap: 12,
    format: "Round Robin",
    region: "APAC",
    description:
      "The Ironclad Series is Black Rose's premier Mobile Legends round-robin invitational — 12 elite squads from across APAC grind through a full round-robin group stage before the top 4 collide in a single-elimination playoff. Every match counts.",
    organizer: "Black Rose Operations",
    contact: "ops@blackrose.gg",
    prizeBreakdown: [
      { place: "1st Place", prize: "₱4,500" },
      { place: "2nd Place", prize: "₱2,500" },
      { place: "3rd Place", prize: "₱1,500" },
      { place: "4th Place", prize: "₱1,000" },
    ],
    schedule: [
      { phase: "Round Robin — Week 1", date: "2026-06-02 – 2026-06-03" },
      { phase: "Round Robin — Week 2", date: "2026-06-09 – 2026-06-10" },
      { phase: "Round Robin — Week 3", date: "2026-06-16 – 2026-06-17" },
      { phase: "Semifinals", date: "2026-06-21", note: "Top 4 from standings" },
      { phase: "Grand Finals", date: "2026-06-22", note: "Best of 3" },
    ],
    rules: standardRules,
    teams: [
      {
        id: "irc-001",
        name: "Lotus Syndicate",
        tag: "LTS",
        captain: "saira",
        seed: 1,
        players: [
          { ign: "saira", role: "Mid" },
          { ign: "kaen", role: "Jungle" },
          { ign: "vex", role: "Roam" },
          { ign: "lior", role: "EXP" },
          { ign: "noor", role: "Gold" },
        ],
      },
      {
        id: "irc-002",
        name: "Nocturne Empire",
        tag: "NCT",
        captain: "vael",
        seed: 2,
        players: [
          { ign: "vael", role: "IGL / Mid" },
          { ign: "sora", role: "Jungle" },
          { ign: "pike", role: "Roam" },
          { ign: "oren", role: "EXP" },
          { ign: "lumi", role: "Gold" },
        ],
      },
      {
        id: "irc-003",
        name: "Jade Phantom",
        tag: "JPH",
        captain: "rein",
        seed: 3,
        players: [
          { ign: "rein", role: "Mid" },
          { ign: "tova", role: "Jungle" },
          { ign: "cael", role: "Roam" },
          { ign: "brix", role: "EXP" },
          { ign: "yuna", role: "Gold" },
        ],
      },
      {
        id: "irc-004",
        name: "Steel Tide",
        tag: "STD",
        captain: "koro",
        players: [
          { ign: "koro", role: "Mid" },
          { ign: "mira", role: "Jungle" },
          { ign: "voss", role: "Roam" },
          { ign: "shan", role: "EXP" },
          { ign: "zero", role: "Gold" },
        ],
      },
    ],
    bracket: [
      {
        label: "Semifinals",
        matches: [
          {
            id: "sf-1",
            round: "Semifinals",
            teamA: "Lotus Syndicate",
            teamB: "Steel Tide",
            scoreA: 2,
            scoreB: 0,
            winner: "Lotus Syndicate",
          },
          {
            id: "sf-2",
            round: "Semifinals",
            teamA: "Nocturne Empire",
            teamB: "Jade Phantom",
            scoreA: undefined,
            scoreB: undefined,
          },
        ],
      },
      {
        label: "Grand Finals",
        matches: [
          {
            id: "gf-1",
            round: "Grand Finals",
            teamA: "Lotus Syndicate",
            teamB: null,
          },
        ],
      },
    ],
  },

  "vlr-onyx": {
    id: "vlr-onyx",
    name: "Valorant Onyx Series",
    game: "Valorant",
    status: "Completed",
    prizePool: "₱25,000",
    startDate: "2026-04-12",
    registrationDeadline: "2026-04-05",
    teamsRegistered: 32,
    teamCap: 32,
    format: "Double Elimination",
    region: "PH",
    description:
      "The Onyx Series was the largest Black Rose Valorant tournament to date — 32 teams, a fully seeded double-elimination bracket, and three weekends of elite competition. Novellino eSports claimed the title in a thrilling grand final.",
    organizer: "Black Rose Operations",
    contact: "ops@blackrose.gg",
    prizeBreakdown: [
      { place: "1st Place", prize: "₱12,000" },
      { place: "2nd Place", prize: "₱7,000" },
      { place: "3rd–4th Place", prize: "₱3,000 each" },
    ],
    schedule: [
      { phase: "Group Stage", date: "2026-04-12 – 2026-04-13" },
      { phase: "Round of 16", date: "2026-04-19" },
      { phase: "Quarterfinals", date: "2026-04-20" },
      { phase: "Semifinals", date: "2026-04-26" },
      { phase: "Grand Finals", date: "2026-04-27", note: "Best of 5" },
    ],
    rules: standardRules,
    teams: [
      {
        id: "t-001",
        name: "Novellino eSports",
        tag: "NE",
        captain: "CoyHa",
        seed: 1,
        players: [
          { ign: "CoyHa", role: "Duelist / IGL" },
          { ign: "Chewie", role: "Controller" },
          { ign: "Cent", role: "Initiator" },
          { ign: "Kiraz", role: "Sentinel" },
          { ign: "Ashburn", role: "Flex" },
        ],
      },
      {
        id: "t-002",
        name: "Crimson Halo",
        tag: "CRH",
        captain: "halox",
        seed: 2,
        players: [
          { ign: "halox", role: "IGL" },
          { ign: "sable", role: "Duelist" },
          { ign: "nyx", role: "Controller" },
          { ign: "iris", role: "Initiator" },
          { ign: "drev", role: "Sentinel" },
        ],
      },
    ],
    bracket: [
      {
        label: "Semifinals",
        matches: [
          {
            id: "sf-1",
            round: "Semifinals",
            teamA: "Novellino eSports",
            teamB: "Ash Reapers",
            scoreA: 13,
            scoreB: 5,
            winner: "Novellino eSports",
          },
          {
            id: "sf-2",
            round: "Semifinals",
            teamA: "Crimson Halo",
            teamB: "Iron Phantom",
            scoreA: 13,
            scoreB: 11,
            winner: "Crimson Halo",
          },
        ],
      },
      {
        label: "Grand Finals",
        matches: [
          {
            id: "gf-1",
            round: "Grand Finals",
            teamA: "Novellino eSports",
            teamB: "Crimson Halo",
            scoreA: 3,
            scoreB: 1,
            winner: "Novellino eSports",
          },
        ],
      },
    ],
  },
};
