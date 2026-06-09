export type NotificationType =
  | "team_invite" // Someone invited you to their team
  | "invite_accepted" // A member accepted your team invite
  | "invite_declined" // A member declined your team invite
  | "tournament_new" // A new tournament was posted
  | "tournament_open" // Registration opened for a tournament
  | "registration_approved" // Your team registration was approved
  | "registration_rejected" // Your team registration was rejected
  | "match_scheduled" // A match has been scheduled for your team
  | "announcement"; // General Black Rose announcement

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** ISO timestamp */
  createdAt: string;
  read: boolean;
  /** Optional deep-link destination */
  href?: string;
}
