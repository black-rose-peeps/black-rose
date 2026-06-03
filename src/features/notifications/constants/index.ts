import type { AppNotification } from "../types";

/**
 * Seed notifications for the mock verified user (CoyHa).
 * Replace with real API data when the backend is ready.
 */
export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-001",
    type: "team_invite",
    title: "Team Invitation",
    body: "Quamico invited you to join Novellino eSports as a substitute.",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    read: false,
    href: "/teams/team-obv",
  },
  {
    id: "notif-002",
    type: "tournament_open",
    title: "Registration Open",
    body: "Valorant Nightfall Cup is now accepting team registrations.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 h ago
    read: false,
    href: "/tournaments/vlr-nightfall",
  },
  {
    id: "notif-003",
    type: "registration_approved",
    title: "Registration Approved",
    body: "Novellino eSports has been approved for CS2 Ironveil Open.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    href: "/tournaments/cs2-ironveil",
  },
  {
    id: "notif-004",
    type: "tournament_new",
    title: "New Tournament Posted",
    body: "CS2 Ashfall Invitational — ₱12,000 prize pool. Registration opens soon.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    read: true,
    href: "/tournaments/cs2-ashfall",
  },
  {
    id: "notif-005",
    type: "announcement",
    title: "Platform Maintenance",
    body: "Brackets and registration will be paused Sunday 02:00–04:00 UTC.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    read: true,
  },
];
