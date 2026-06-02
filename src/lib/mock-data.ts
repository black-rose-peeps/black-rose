// Mock data for Black Rose admin (frontend flow only)

export type TournamentStatus = "Draft" | "Registration Open" | "Registration Closed" | "Live" | "Completed" | "Archived";

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
    prizePool: "$5,000",
    startDate: "2026-06-21",
    registrationDeadline: "2026-06-18",
    teamsRegistered: 14,
    teamCap: 32,
  },
  {
    id: "mlbb-thorne",
    name: "MLBB Thorne Invitational",
    game: "MLBB",
    status: "Registration Closed",
    prizePool: "$3,200",
    startDate: "2026-06-14",
    registrationDeadline: "2026-06-08",
    teamsRegistered: 16,
    teamCap: 16,
  },
  {
    id: "cs2-ironveil",
    name: "CS2 Ironveil Open",
    game: "CS2",
    status: "Live",
    prizePool: "$7,500",
    startDate: "2026-05-30",
    registrationDeadline: "2026-05-25",
    teamsRegistered: 24,
    teamCap: 24,
  },
  {
    id: "vlr-onyx",
    name: "Valorant Onyx Series",
    game: "Valorant",
    status: "Completed",
    prizePool: "$10,000",
    startDate: "2026-04-12",
    registrationDeadline: "2026-04-05",
    teamsRegistered: 32,
    teamCap: 32,
  },
  {
    id: "mlbb-bloom",
    name: "MLBB Bloom Qualifier",
    game: "MLBB",
    status: "Draft",
    prizePool: "$1,500",
    startDate: "2026-07-04",
    registrationDeadline: "2026-06-28",
    teamsRegistered: 0,
    teamCap: 24,
  },
];

export const mockTeams: MockTeam[] = [
  {
    id: "t-001",
    name: "Obsidian Vipers",
    tag: "OBV",
    captain: "thornn",
    members: [
      { ign: "thornn", role: "Duelist / IGL", discord: "thornn#0001" },
      { ign: "azael", role: "Controller", discord: "azael#1142" },
      { ign: "kairo", role: "Initiator", discord: "kairo#0098" },
      { ign: "voss", role: "Sentinel", discord: "voss#7732" },
      { ign: "ren", role: "Flex", discord: "ren#0420" },
    ],
    registrationDate: "2026-05-28",
    status: "Pending",
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
    name: "Lotus Syndicate",
    tag: "LTS",
    captain: "saira",
    members: [
      { ign: "saira", role: "Mid", discord: "saira#0231" },
      { ign: "kaen", role: "Jungle", discord: "kaen#1188" },
      { ign: "vex", role: "Roam", discord: "vex#0772" },
      { ign: "lior", role: "EXP", discord: "lior#4413" },
      { ign: "noor", role: "Gold", discord: "noor#9921" },
    ],
    registrationDate: "2026-05-30",
    status: "Rejected",
    tournamentId: "vlr-nightfall",
    history: [],
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
      { ign: "echo", role: "Initiator", discord: "echo#1234" },
      { ign: "ire", role: "Controller", discord: "ire#0099" },
    ],
    registrationDate: "2026-06-01",
    status: "Pending",
    tournamentId: "vlr-nightfall",
    history: [],
  },
];

export const mockUsers: MockUser[] = [
  { id: "u-001", username: "thornn", email: "thornn@blackrose.gg", role: "User", registrationDate: "2026-02-12", status: "Active" },
  { id: "u-002", username: "halox", email: "halox@blackrose.gg", role: "User", registrationDate: "2026-03-04", status: "Active" },
  { id: "u-003", username: "marshal", email: "marshal@blackrose.gg", role: "Tournament Admin", registrationDate: "2026-01-19", status: "Active" },
  { id: "u-004", username: "ire", email: "ire@blackrose.gg", role: "User", registrationDate: "2026-04-22", status: "Suspended" },
  { id: "u-005", username: "saira", email: "saira@blackrose.gg", role: "User", registrationDate: "2026-05-30", status: "Active" },
  { id: "u-006", username: "warden", email: "warden@blackrose.gg", role: "Super Admin", registrationDate: "2025-11-02", status: "Active" },
];

export const mockOverview = {
  totalUsers: 1284,
  totalTeams: 312,
  activeTournaments: 4,
  pendingRegistrations: 18,
  completedTournaments: 27,
};
