// Mock team data — frontend placeholder only
import type { Team } from "@/features/teams/types";

export const mockTeams: Team[] = [
  {
    id: "team-obv",
    name: "Novellino eSports",
    tag: "OBV",
    game: "Valorant",
    captainUserId: "mock_verified_001", // CoyHa
    createdAt: "2026-02-20T00:00:00.000Z",
    activeTournamentId: "vlr-nightfall",
    activeTournamentName: "Valorant Nightfall Cup",
    members: [
      {
        userId: "mock_verified_001",
        username: "CoyHa",
        displayName: "CoyHa",
        avatarInitials: "CH",
        ign: "CoyHa",
        role: "IGL",
        status: "captain",
        joinedAt: "2026-02-20T00:00:00.000Z",
      },
      {
        userId: "u-azael",
        username: "Chewie",
        displayName: "Chewie",
        avatarInitials: "CW",
        ign: "Chewie",
        role: "Controller",
        status: "active",
        joinedAt: "2026-02-21T00:00:00.000Z",
      },
      {
        userId: "u-kairo",
        username: "Cent",
        displayName: "Cent",
        avatarInitials: "CT",
        ign: "Cent",
        role: "Initiator",
        status: "active",
        joinedAt: "2026-02-21T00:00:00.000Z",
      },
      {
        userId: "u-voss",
        username: "Kiraz",
        displayName: "Kiraz",
        avatarInitials: "KZ",
        ign: "Kiraz",
        role: "Sentinel",
        status: "active",
        joinedAt: "2026-02-22T00:00:00.000Z",
      },
      {
        userId: "u-ren",
        username: "Ashburn",
        displayName: "Ashburn",
        avatarInitials: "AB",
        ign: "Ashburn",
        role: "Flex",
        status: "active",
        joinedAt: "2026-02-22T00:00:00.000Z",
      },
      {
        userId: "u-quamico",
        username: "Quamico",
        displayName: "Quamico",
        avatarInitials: "QM",
        ign: "Quamico",
        role: "Sub",
        status: "invited",
        joinedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  },
];

/** Get the team a given user is a member or captain of (returns the first match) */
export function getTeamByUserId(userId: string): Team | null {
  return mockTeams.find((t) => t.members.some((m) => m.userId === userId)) ?? null;
}

/** Get a team by its ID */
export function getTeamById(id: string): Team | null {
  return mockTeams.find((t) => t.id === id) ?? null;
}

/** Mock list of all registered members (for invite search) */
export const mockRegisteredMembers = [
  { userId: "u-halox", username: "halox", displayName: "halox", avatarInitials: "HA" },
  { userId: "u-ghost", username: "ghost", displayName: "ghost", avatarInitials: "GH" },
  { userId: "u-saira", username: "saira", displayName: "saira", avatarInitials: "SA" },
  { userId: "u-rave", username: "rave", displayName: "rave", avatarInitials: "RA" },
  { userId: "u-byte", username: "byte", displayName: "byte", avatarInitials: "BY" },
  { userId: "u-nova", username: "nova", displayName: "nova", avatarInitials: "NO" },
  { userId: "u-quamico", username: "Quamico", displayName: "Quamico", avatarInitials: "QM" },
];
