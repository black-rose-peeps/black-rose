import { createServerFn } from "@tanstack/react-start";

export const deleteTeamAdminFn = createServerFn({ method: "POST" })
  .validator((data: { teamId: string }) => {
    if (!data?.teamId?.trim()) throw new Error("Missing team id.");
    return { teamId: data.teamId.trim() };
  })
  .handler(async ({ data }): Promise<void> => {
    const { deleteTeamAsAdmin } = await import("../server/teams-admin.server");
    await deleteTeamAsAdmin(data.teamId);
  });
