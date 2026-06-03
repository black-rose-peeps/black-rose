import type { Team, TeamMember, TeamMemberRole } from "@/features/teams/types";

const GAMES: Team["game"][] = ["Valorant", "League of Legends", "Teamfight Tactics"];

const VALORANT_ROLES: TeamMemberRole[] = [
  "Duelist",
  "Controller",
  "Initiator",
  "Sentinel",
  "Flex",
  "IGL",
];

const LOL_ROLES: TeamMemberRole[] = ["Top", "Jungle", "Mid", "Support", "IGL"];

const TFT_ROLES: TeamMemberRole[] = ["Flex", "IGL", "TBD"];

const TEAM_NAMES = [
  "Novellino eSports",
  "Crimson Halo",
  "Phoenix Rising",
  "Ash Reapers",
  "Iron Titans",
  "Frost Legion",
  "Solar Flare",
  "Quantum Strike",
  "Void Walkers",
  "Eclipse Warriors",
  "Raven Strike",
  "Neon Syndicate",
  "Obsidian Core",
  "Pulse Breakers",
  "Cipher Unit",
  "Aurora Five",
  "Static Reign",
  "Midnight Forge",
  "Zenith Line",
  "Storm Breakers",
  "Ember Wolves",
  "Crystal Guard",
  "Shadow Pulse",
  "Thunder Coil",
  "Violet Crown",
  "Granite Peak",
  "Silver Tide",
  "Copper Fang",
  "Jade Serpent",
  "Onyx Vanguard",
  "Prism Force",
  "Rift Hunters",
  "Blaze Circuit",
  "Northwind",
  "Southgate",
  "Eastwatch",
  "Westfall",
  "Highline",
  "Lowburn",
  "Deepwell",
];

function rolesForGame(game: Team["game"]): TeamMemberRole[] {
  if (game === "League of Legends") return LOL_ROLES;
  if (game === "Teamfight Tactics") return TFT_ROLES;
  return VALORANT_ROLES;
}

function makeTag(name: string, index: number): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].slice(0, 1) + words[1].slice(0, 1)).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase().padEnd(3, "X").slice(0, 3);
}

function makeMember(
  teamIndex: number,
  slot: number,
  role: TeamMemberRole,
  isCaptain: boolean,
): TeamMember {
  const id = `gen-u-${teamIndex}-${slot}`;
  const username = `player${teamIndex}_${slot}`;
  return {
    userId: id,
    username,
    displayName: username,
    avatarInitials: username.slice(0, 2).toUpperCase(),
    ign: username,
    role,
    status: isCaptain ? "captain" : "active",
    joinedAt: new Date(2026, 1, 1 + (teamIndex % 28)).toISOString(),
  };
}

export function generateMockRosterTeams(count: number): Team[] {
  const teams: Team[] = [];

  for (let i = 0; i < count; i++) {
    const name = TEAM_NAMES[i % TEAM_NAMES.length];
    const suffix = i >= TEAM_NAMES.length ? ` ${Math.floor(i / TEAM_NAMES.length) + 1}` : "";
    const fullName = `${name}${suffix}`;
    const game = GAMES[i % GAMES.length];
    const roles = rolesForGame(game);
    const captain = makeMember(i, 0, roles[0], true);
    const members: TeamMember[] = [captain];

    for (let s = 1; s < 5; s++) {
      members.push(makeMember(i, s, roles[s % roles.length], false));
    }

    teams.push({
      id: `team-gen-${String(i + 1).padStart(3, "0")}`,
      name: fullName,
      tag: makeTag(fullName, i),
      game,
      captainUserId: captain.userId,
      members,
      createdAt: new Date(2026, 0, 5 + (i % 60)).toISOString(),
      activeTournamentId: i === 0 ? "vlr-nightfall" : null,
      activeTournamentName: i === 0 ? "Valorant Nightfall Cup" : null,
    });
  }

  return teams;
}

export function generateMockMemberUsers(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `u-gen-${String(n).padStart(4, "0")}`,
      username: `RosterPlayer${n}`,
      email: `roster${n}@blackrose.gg`,
      role: "User" as const,
      registrationDate: new Date(2026, 0, 1 + (i % 90)).toISOString().slice(0, 10),
      status: "Active" as const,
    };
  });
}
