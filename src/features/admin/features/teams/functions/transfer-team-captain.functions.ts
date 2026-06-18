import { createServerFn, getGlobalStartContext } from "@tanstack/react-start";

export const transferTeamCaptainFn = createServerFn({ method: "POST" })
  .validator((data: { teamId: string; newCaptainUserId: string }) => {
    if (!data?.teamId?.trim()) throw new Error("Missing team id.");
    if (!data?.newCaptainUserId?.trim()) throw new Error("Missing new captain.");
    return {
      teamId: data.teamId.trim(),
      newCaptainUserId: data.newCaptainUserId.trim(),
    };
  })
  .handler(async ({ data }): Promise<void> => {
    const context = getGlobalStartContext() as { memberId?: string | null } | undefined;
    const memberId = context?.memberId;
    if (!memberId) {
      throw new Error("You must be signed in to transfer captaincy.");
    }

    const { transferTeamCaptain } = await import("../server/teams-admin.server");
    await transferTeamCaptain(data.teamId, memberId, data.newCaptainUserId);
  });
