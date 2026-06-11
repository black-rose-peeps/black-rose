import { createServerFn } from "@tanstack/react-start";

export const unlinkRiotAccount = createServerFn({ method: "POST" })
  .inputValidator((data: { memberId: string }) => {
    if (!data?.memberId?.trim()) throw new Error("Missing member id.");
    return { memberId: data.memberId.trim() };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { unlinkRiotAccount: unlink } = await import("../server/riot-accounts.server");
    const { findMemberById } = await import("@/features/auth/server/member-auth.server");

    const member = await findMemberById(data.memberId);
    if (!member) throw new Error("Member not found.");

    await unlink(data.memberId);
    return { ok: true };
  });
