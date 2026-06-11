import { createServerFn } from "@tanstack/react-start";
import type { RiotAccount } from "@/features/member/types";

export const updateRiotVisibility = createServerFn({ method: "POST" })
  .inputValidator((data: { memberId: string; isPublic: boolean }) => {
    if (!data?.memberId?.trim()) throw new Error("Missing member id.");
    return {
      memberId: data.memberId.trim(),
      isPublic: Boolean(data.isPublic),
    };
  })
  .handler(async ({ data }): Promise<{ riotAccount: RiotAccount }> => {
    const { updateRiotAccountVisibility, rowToRiotAccount } = await import(
      "../server/riot-accounts.server"
    );
    const { findMemberById } = await import("@/features/auth/server/member-auth.server");

    const member = await findMemberById(data.memberId);
    if (!member) throw new Error("Member not found.");

    const row = await updateRiotAccountVisibility(data.memberId, data.isPublic);
    return { riotAccount: rowToRiotAccount(row, true) };
  });
