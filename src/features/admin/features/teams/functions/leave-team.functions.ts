import { createServerFn, getGlobalStartContext } from "@tanstack/react-start";

export const leaveTeamFn = createServerFn({ method: "POST" })
  .validator((data: { teamId: string }) => {
    if (!data?.teamId?.trim()) throw new Error("Missing team id.");
    return { teamId: data.teamId.trim() };
  })
  .handler(async ({ data }): Promise<void> => {
    const context = getGlobalStartContext() as { memberId?: string | null } | undefined;
    const memberId = context?.memberId;
    if (!memberId) {
      throw new Error("You must be signed in to leave a team.");
    }

    const { leaveTeamAsMember } = await import("../server/teams-admin.server");
    await leaveTeamAsMember(data.teamId, memberId);
  });
