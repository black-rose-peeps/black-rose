import { createServerFn } from "@tanstack/react-start";

export const deleteTeamCaptainFn = createServerFn({ method: "POST" })
  .validator((data: { teamId: string; captainUserId: string }) => {
    if (!data?.teamId?.trim()) throw new Error("Missing team id.");
    if (!data?.captainUserId?.trim()) throw new Error("Missing captain user id.");
    return {
      teamId: data.teamId.trim(),
      captainUserId: data.captainUserId.trim(),
    };
  })
  .handler(async ({ data }): Promise<void> => {
    const { deleteTeamAsCaptain } = await import("../server/teams-admin.server");
    await deleteTeamAsCaptain(data.teamId, data.captainUserId);
  });
