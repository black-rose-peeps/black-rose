export interface GameMembershipAcceptance {
  eventId: string;
  gameId: string;
  gameName: string;
  createdAt: string;
}

/** Owner identity is supplied by the trusted server, never by browser claims. */
export interface GameMembershipAcceptanceFeed {
  memberId: string;
  events: GameMembershipAcceptance[];
}
