import { createServerFn } from "@tanstack/react-start";

/** The server derives ownership from the signed session; no browser member ID is accepted. */
export const fetchMyGameMembershipAcceptances = createServerFn({ method: "POST" }).handler(
  async () => {
    const server = await import("../server/game-membership-notifications.server");
    return server.fetchMyGameMembershipAcceptances();
  },
);
