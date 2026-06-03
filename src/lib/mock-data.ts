// Mock data for Black Rose (frontend flow only)

import { generateMockMemberUsers } from "./generate-mock-rosters";

export type TournamentStatus =
  | "Draft"
  | "Registration Open"
  | "Registration Closed"
  | "Live"
  | "Completed"
  | "Archived";

export interface MockTournament {
  id: string;
  name: string;
  game: "Valorant" | "League of Legends" | "Teamfight Tactics";
  status: TournamentStatus;
  prizePool: string;
  startDate: string;
  registrationDeadline: string;
  teamsRegistered: number;
  teamCap: number;
  format: string;
  region: string;
}

export interface MockPlayer {
  ign: string;
  role: string;
  discord: string;
}

export interface MockTeam {
  id: string;
  /** Links to admin roster `Team.id` when registered from the Teams pipeline. */
  rosterTeamId?: string;
  name: string;
  tag: string;
  captain: string;
  members: MockPlayer[];
  registrationDate: string;
  status: "Pending" | "Approved" | "Rejected";
  tournamentId: string;
  history: string[];
}

export interface MockUser {
  id: string;
  username: string;
  email: string;
  role: "User" | "Tournament Admin" | "Super Admin";
  registrationDate: string;
  status: "Active" | "Suspended" | "Banned";
}

export const mockTournaments: MockTournament[] = [
  {
    id: "vlr-nightfall",
    name: "Valorant Nightfall Cup",
    game: "Valorant",
    status: "Registration Open",
    prizePool: "₱10,000",
    startDate: "2026-06-21",
    registrationDeadline: "2026-06-18",
    teamsRegistered: 16,
    teamCap: 32,
    format: "Single Elimination",
    region: "PH",
  },
  {
    id: "lol-twilight",
    name: "Twilight Clash",
    game: "League of Legends",
    status: "Registration Closed",
    prizePool: "$5,000",
    startDate: "2026-07-12",
    registrationDeadline: "2026-07-08",
    teamsRegistered: 8,
    teamCap: 16,
    format: "Double Elimination",
    region: "SEA",
  },
];

export const mockTeams: MockTeam[] = [
  {
    id: "t-001",
    name: "Novellino eSports",
    tag: "NE",
    captain: "CoyHa",
    members: [
      { ign: "CoyHa", role: "Duelist / IGL", discord: "CoyHa#2026" },
      { ign: "Chewie", role: "Controller", discord: "Chewie#0001" },
      { ign: "Cent", role: "Initiator", discord: "Cent#0001" },
      { ign: "Kiraz", role: "Sentinel", discord: "Kiraz#0001" },
      { ign: "Ashburn", role: "Flex", discord: "Ashburn#0001" },
    ],
    registrationDate: "2026-05-28",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Onyx Series — Top 8", "Valorant Spring Open — Champions"],
  },
  {
    id: "t-002",
    name: "Crimson Halo",
    tag: "CRH",
    captain: "halox",
    members: [
      { ign: "halox", role: "IGL", discord: "halox#0007" },
      { ign: "sable", role: "Duelist", discord: "sable#2210" },
      { ign: "nyx", role: "Controller", discord: "nyx#0001" },
      { ign: "iris", role: "Initiator", discord: "iris#3318" },
      { ign: "drev", role: "Sentinel", discord: "drev#9912" },
    ],
    registrationDate: "2026-05-29",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Onyx Series — Semifinals"],
  },
  {
    id: "t-003",
    name: "Silver Wolves",
    tag: "SLW",
    captain: "ghost",
    members: [
      { ign: "ghost", role: "AWPer", discord: "ghost#1010" },
      { ign: "kara", role: "Rifler", discord: "kara#2244" },
      { ign: "vesp", role: "Support", discord: "vesp#0098" },
      { ign: "tael", role: "Lurker", discord: "tael#5577" },
      { ign: "mira", role: "IGL", discord: "mira#9001" },
    ],
    registrationDate: "2026-05-22",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Winter Brawl — Runner-up"],
  },
  {
    id: "t-004",
    name: "Phoenix Rising",
    tag: "PHX",
    captain: "saira",
    members: [
      { ign: "saira", role: "Duelist", discord: "saira#0231" },
      { ign: "kaen", role: "Controller", discord: "kaen#1188" },
      { ign: "vex", role: "Initiator", discord: "vex#0772" },
      { ign: "lior", role: "Sentinel", discord: "lior#4413" },
      { ign: "noor", role: "Flex", discord: "noor#9921" },
    ],
    registrationDate: "2026-05-30",
    status: "Pending",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Eclipse Cup — Champions"],
  },
  {
    id: "t-005",
    name: "Ash Reapers",
    tag: "ASH",
    captain: "rave",
    members: [
      { ign: "rave", role: "IGL", discord: "rave#3300" },
      { ign: "byte", role: "Duelist", discord: "byte#0011" },
      { ign: "nova", role: "Sentinel", discord: "nova#7788" },
      { ign: "Quamico", role: "Initiator", discord: "Quamico#0001" },
      { ign: "ire", role: "Controller", discord: "ire#0099" },
    ],
    registrationDate: "2026-06-01",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Crimson Qualifier — Runner-up"],
  },
  {
    id: "t-006",
    name: "Viper Squad",
    tag: "VPR",
    captain: "toxin",
    members: [
      { ign: "toxin", role: "Controller / IGL", discord: "toxin#1337" },
      { ign: "venom", role: "Duelist", discord: "venom#0420" },
      { ign: "spike", role: "Initiator", discord: "spike#9090" },
      { ign: "steel", role: "Sentinel", discord: "steel#7777" },
      { ign: "flash", role: "Flex", discord: "flash#1234" },
    ],
    registrationDate: "2026-06-02",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Spring Series — Top 4"],
  },
  {
    id: "t-007",
    name: "Thunder Wolves",
    tag: "TWF",
    captain: "storm",
    members: [
      { ign: "storm", role: "Duelist", discord: "storm#2468" },
      { ign: "lightning", role: "IGL", discord: "lightning#1357" },
      { ign: "thunder", role: "Controller", discord: "thunder#8642" },
      { ign: "bolt", role: "Initiator", discord: "bolt#9753" },
      { ign: "spark", role: "Sentinel", discord: "spark#1111" },
    ],
    registrationDate: "2026-06-03",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Winter Open — Top 8"],
  },
  {
    id: "t-008",
    name: "Neon Guardians",
    tag: "NGU",
    captain: "cyber",
    members: [
      { ign: "cyber", role: "Controller / IGL", discord: "cyber#4040" },
      { ign: "neon", role: "Duelist", discord: "neon#5050" },
      { ign: "pixel", role: "Initiator", discord: "pixel#6060" },
      { ign: "matrix", role: "Sentinel", discord: "matrix#7070" },
      { ign: "glitch", role: "Flex", discord: "glitch#8080" },
    ],
    registrationDate: "2026-06-04",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Cyber Cup — Top 4"],
  },
  {
    id: "t-009",
    name: "Mystic Shadows",
    tag: "MSH",
    captain: "shadow",
    members: [
      { ign: "shadow", role: "Duelist", discord: "shadow#3030" },
      { ign: "phantom", role: "Controller", discord: "phantom#4141" },
      { ign: "wraith", role: "IGL", discord: "wraith#5252" },
      { ign: "shade", role: "Initiator", discord: "shade#6363" },
      { ign: "void", role: "Sentinel", discord: "void#7474" },
    ],
    registrationDate: "2026-06-05",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Shadow League — Champions"],
  },
  {
    id: "t-010",
    name: "Apex Predators",
    tag: "APX",
    captain: "hunter",
    members: [
      { ign: "hunter", role: "IGL", discord: "hunter#1212" },
      { ign: "predator", role: "Duelist", discord: "predator#2323" },
      { ign: "stalker", role: "Initiator", discord: "stalker#3434" },
      { ign: "prowler", role: "Controller", discord: "prowler#4545" },
      { ign: "beast", role: "Sentinel", discord: "beast#5656" },
    ],
    registrationDate: "2026-06-06",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Predator Series — Runner-up"],
  },
  {
    id: "t-011",
    name: "Iron Titans",
    tag: "ITN",
    captain: "titan",
    members: [
      { ign: "titan", role: "Sentinel / IGL", discord: "titan#9999" },
      { ign: "forge", role: "Duelist", discord: "forge#8888" },
      { ign: "anvil", role: "Controller", discord: "anvil#7777" },
      { ign: "hammer", role: "Initiator", discord: "hammer#6666" },
      { ign: "steel", role: "Flex", discord: "steel#5555" },
    ],
    registrationDate: "2026-06-07",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Iron Championship — Top 8"],
  },
  {
    id: "t-012",
    name: "Frost Legion",
    tag: "FLG",
    captain: "frost",
    members: [
      { ign: "frost", role: "Controller / IGL", discord: "frost#1001" },
      { ign: "ice", role: "Duelist", discord: "ice#2002" },
      { ign: "blizzard", role: "Initiator", discord: "blizzard#3003" },
      { ign: "arctic", role: "Sentinel", discord: "arctic#4004" },
      { ign: "glacier", role: "Flex", discord: "glacier#5005" },
    ],
    registrationDate: "2026-06-08",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Frost Tournament — Top 4"],
  },
  {
    id: "t-013",
    name: "Solar Flare",
    tag: "SOL",
    captain: "solar",
    members: [
      { ign: "solar", role: "Duelist", discord: "solar#1313" },
      { ign: "flare", role: "IGL", discord: "flare#2424" },
      { ign: "burn", role: "Controller", discord: "burn#3535" },
      { ign: "ember", role: "Initiator", discord: "ember#4646" },
      { ign: "flame", role: "Sentinel", discord: "flame#5757" },
    ],
    registrationDate: "2026-06-09",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Solar Series — Champions"],
  },
  {
    id: "t-014",
    name: "Quantum Strike",
    tag: "QTS",
    captain: "quantum",
    members: [
      { ign: "quantum", role: "Controller / IGL", discord: "quantum#0101" },
      { ign: "particle", role: "Duelist", discord: "particle#0202" },
      { ign: "atom", role: "Initiator", discord: "atom#0303" },
      { ign: "photon", role: "Sentinel", discord: "photon#0404" },
      { ign: "neuron", role: "Flex", discord: "neuron#0505" },
    ],
    registrationDate: "2026-06-10",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Quantum League — Runner-up"],
  },
  {
    id: "t-015",
    name: "Void Walkers",
    tag: "VWK",
    captain: "void",
    members: [
      { ign: "void", role: "Duelist", discord: "void#6767" },
      { ign: "walker", role: "IGL", discord: "walker#7878" },
      { ign: "dimension", role: "Controller", discord: "dimension#8989" },
      { ign: "portal", role: "Initiator", discord: "portal#9090" },
      { ign: "rift", role: "Sentinel", discord: "rift#0101" },
    ],
    registrationDate: "2026-06-11",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Void Championship — Top 8"],
  },
  {
    id: "t-016",
    name: "Eclipse Warriors",
    tag: "ECW",
    captain: "eclipse",
    members: [
      { ign: "eclipse", role: "Controller / IGL", discord: "eclipse#1122" },
      { ign: "warrior", role: "Duelist", discord: "warrior#2233" },
      { ign: "moon", role: "Initiator", discord: "moon#3344" },
      { ign: "sun", role: "Sentinel", discord: "sun#4455" },
      { ign: "star", role: "Flex", discord: "star#5566" },
    ],
    registrationDate: "2026-06-12",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Eclipse Series — Top 4"],
  },
  {
    id: "t-017",
    name: "Raven Strike",
    tag: "RST",
    captain: "raven",
    members: [
      { ign: "raven", role: "Duelist / IGL", discord: "raven#7788" },
      { ign: "strike", role: "Controller", discord: "strike#9900" },
      { ign: "shadow", role: "Initiator", discord: "shadow#1122" },
      { ign: "blade", role: "Sentinel", discord: "blade#3344" },
      { ign: "storm", role: "Flex", discord: "storm#5566" },
    ],
    registrationDate: "2026-06-13",
    status: "Approved",
    tournamentId: "vlr-nightfall",
    history: ["Valorant Raven Cup — Champions", "Valorant Strike League — Top 8"],
  },
  {
    id: "t-tw-001",
    name: "Neon Syndicate",
    tag: "NSY",
    captain: "pulse",
    members: [
      { ign: "pulse", role: "Top", discord: "pulse#1001" },
      { ign: "wire", role: "Jungle", discord: "wire#1002" },
      { ign: "flux", role: "Mid", discord: "flux#1003" },
      { ign: "grid", role: "ADC", discord: "grid#1004" },
      { ign: "arc", role: "Support", discord: "arc#1005" },
    ],
    registrationDate: "2026-07-01",
    status: "Approved",
    tournamentId: "lol-twilight",
    history: [],
  },
  {
    id: "t-tw-002",
    name: "Obsidian Core",
    tag: "OBS",
    captain: "onyx",
    members: [
      { ign: "onyx", role: "Top", discord: "onyx#2001" },
      { ign: "shard", role: "Jungle", discord: "shard#2002" },
      { ign: "basalt", role: "Mid", discord: "basalt#2003" },
      { ign: "flint", role: "ADC", discord: "flint#2004" },
      { ign: "slate", role: "Support", discord: "slate#2005" },
    ],
    registrationDate: "2026-07-01",
    status: "Approved",
    tournamentId: "lol-twilight",
    history: [],
  },
  {
    id: "t-tw-003",
    name: "Pulse Breakers",
    tag: "PLS",
    captain: "beat",
    members: [
      { ign: "beat", role: "Top", discord: "beat#3001" },
      { ign: "tempo", role: "Jungle", discord: "tempo#3002" },
      { ign: "echo", role: "Mid", discord: "echo#3003" },
      { ign: "rhythm", role: "ADC", discord: "rhythm#3004" },
      { ign: "bass", role: "Support", discord: "bass#3005" },
    ],
    registrationDate: "2026-07-02",
    status: "Approved",
    tournamentId: "lol-twilight",
    history: [],
  },
  {
    id: "t-tw-004",
    name: "Cipher Unit",
    tag: "CPH",
    captain: "key",
    members: [
      { ign: "key", role: "Top", discord: "key#4001" },
      { ign: "lock", role: "Jungle", discord: "lock#4002" },
      { ign: "hash", role: "Mid", discord: "hash#4003" },
      { ign: "token", role: "ADC", discord: "token#4004" },
      { ign: "byte", role: "Support", discord: "byte#4005" },
    ],
    registrationDate: "2026-07-02",
    status: "Approved",
    tournamentId: "lol-twilight",
    history: [],
  },
  {
    id: "t-tw-005",
    name: "Aurora Five",
    tag: "AUR",
    captain: "dawn",
    members: [
      { ign: "dawn", role: "Top", discord: "dawn#5001" },
      { ign: "glow", role: "Jungle", discord: "glow#5002" },
      { ign: "ray", role: "Mid", discord: "ray#5003" },
      { ign: "halo", role: "ADC", discord: "halo#5004" },
      { ign: "lumen", role: "Support", discord: "lumen#5005" },
    ],
    registrationDate: "2026-07-03",
    status: "Approved",
    tournamentId: "lol-twilight",
    history: [],
  },
  {
    id: "t-tw-006",
    name: "Static Reign",
    tag: "STC",
    captain: "volt",
    members: [
      { ign: "volt", role: "Top", discord: "volt#6001" },
      { ign: "surge", role: "Jungle", discord: "surge#6002" },
      { ign: "ohm", role: "Mid", discord: "ohm#6003" },
      { ign: "amp", role: "ADC", discord: "amp#6004" },
      { ign: "watt", role: "Support", discord: "watt#6005" },
    ],
    registrationDate: "2026-07-03",
    status: "Approved",
    tournamentId: "lol-twilight",
    history: [],
  },
  {
    id: "t-tw-007",
    name: "Midnight Forge",
    tag: "MFG",
    captain: "anvil",
    members: [
      { ign: "anvil", role: "Top", discord: "anvil#7001" },
      { ign: "ember", role: "Jungle", discord: "ember#7002" },
      { ign: "coal", role: "Mid", discord: "coal#7003" },
      { ign: "spark", role: "ADC", discord: "spark#7004" },
      { ign: "iron", role: "Support", discord: "iron#7005" },
    ],
    registrationDate: "2026-07-04",
    status: "Approved",
    tournamentId: "lol-twilight",
    history: [],
  },
  {
    id: "t-tw-008",
    name: "Zenith Line",
    tag: "ZEN",
    captain: "apex",
    members: [
      { ign: "apex", role: "Top", discord: "apex#8001" },
      { ign: "peak", role: "Jungle", discord: "peak#8002" },
      { ign: "ridge", role: "Mid", discord: "ridge#8003" },
      { ign: "crest", role: "ADC", discord: "crest#8004" },
      { ign: "summit", role: "Support", discord: "summit#8005" },
    ],
    registrationDate: "2026-07-04",
    status: "Approved",
    tournamentId: "lol-twilight",
    history: [],
  },
];

const coreMockUsers: MockUser[] = [
  {
    id: "u-001",
    username: "CoyHa",
    email: "CoyHa@blackrose.gg",
    role: "User",
    registrationDate: "2026-02-12",
    status: "Active",
  },
  {
    id: "u-002",
    username: "halox",
    email: "halox@blackrose.gg",
    role: "User",
    registrationDate: "2026-03-04",
    status: "Active",
  },
  {
    id: "u-003",
    username: "marshal",
    email: "marshal@blackrose.gg",
    role: "Tournament Admin",
    registrationDate: "2026-01-19",
    status: "Active",
  },
  {
    id: "u-004",
    username: "ire",
    email: "ire@blackrose.gg",
    role: "User",
    registrationDate: "2026-04-22",
    status: "Suspended",
  },
  {
    id: "u-005",
    username: "saira",
    email: "saira@blackrose.gg",
    role: "User",
    registrationDate: "2026-05-30",
    status: "Active",
  },
  {
    id: "u-006",
    username: "warden",
    email: "warden@blackrose.gg",
    role: "Super Admin",
    registrationDate: "2025-11-02",
    status: "Active",
  },
];

export const mockUsers: MockUser[] = [...coreMockUsers, ...generateMockMemberUsers(54)];

export const mockOverview = {
  totalUsers: mockUsers.length,
  totalTeams: 48,
  activeTournaments: 2,
  pendingRegistrations: 3,
  completedTournaments: 12,
};
