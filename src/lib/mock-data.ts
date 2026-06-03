// Mock data for Black Rose (frontend flow only)

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
  game: "Valorant" | "MLBB" | "CS2";
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
    teamsRegistered: 17,
    teamCap: 32,
    format: "Single Elimination",
    region: "PH",
  },
  {
    id: "mlbb-thorne",
    name: "MLBB Thorne Invitational",
    game: "MLBB",
    status: "Registration Closed",
    prizePool: "₱8,000",
    startDate: "2026-06-14",
    registrationDeadline: "2026-06-08",
    teamsRegistered: 16,
    teamCap: 16,
    format: "Single Elimination",
    region: "SEA",
  },
  {
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
  },
  {
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
  },
  {
    id: "mlbb-bloom",
    name: "MLBB Bloom Qualifier",
    game: "MLBB",
    status: "Registration Open",
    prizePool: "₱5,000",
    startDate: "2026-07-04",
    registrationDeadline: "2026-06-28",
    teamsRegistered: 6,
    teamCap: 24,
    format: "Round Robin + Playoffs",
    region: "PH",
  },
  {
    id: "cs2-ashfall",
    name: "CS2 Ashfall Invitational",
    game: "CS2",
    status: "Registration Open",
    prizePool: "₱12,000",
    startDate: "2026-07-12",
    registrationDeadline: "2026-07-08",
    teamsRegistered: 9,
    teamCap: 16,
    format: "Single Elimination",
    region: "SEA",
  },
  {
    id: "vlr-crimson",
    name: "Valorant Crimson Qualifier",
    game: "Valorant",
    status: "Completed",
    prizePool: "₱6,000",
    startDate: "2026-03-08",
    registrationDeadline: "2026-03-01",
    teamsRegistered: 16,
    teamCap: 16,
    format: "Single Elimination",
    region: "PH",
  },
  {
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
  },
  {
    id: "cs2-phantom",
    name: "CS2 Phantom League",
    game: "CS2",
    status: "Completed",
    prizePool: "₱20,000",
    startDate: "2026-02-15",
    registrationDeadline: "2026-02-08",
    teamsRegistered: 24,
    teamCap: 24,
    format: "GSL + Playoffs",
    region: "SEA",
  },
  {
    id: "vlr-eclipse",
    name: "Valorant Eclipse Cup",
    game: "Valorant",
    status: "Archived",
    prizePool: "₱4,000",
    startDate: "2025-12-10",
    registrationDeadline: "2025-12-05",
    teamsRegistered: 8,
    teamCap: 8,
    format: "Single Elimination",
    region: "PH",
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
    tournamentId: "cs2-ironveil",
    history: ["CS2 Winter Brawl — Runner-up"],
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
    status: "Approved",
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
];

export const mockUsers: MockUser[] = [
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

export const mockOverview = {
  totalUsers: 1284,
  totalTeams: 312,
  activeTournaments: 4,
  pendingRegistrations: 18,
  completedTournaments: 27,
};
