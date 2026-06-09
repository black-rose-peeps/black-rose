import { createServerFn } from "@tanstack/react-start";
import type { MemberVerificationStatus } from "@/features/admin/features/members/types";

export interface RefreshMemberSessionInput {
  memberId: string;
}

export interface RefreshMemberSessionResult {
  memberId: string;
  username: string;
  discordId: string | null;
  status: MemberVerificationStatus;
  registeredAt: string;
}

export const refreshMemberSession = createServerFn({ method: "POST" })
  .inputValidator((data: RefreshMemberSessionInput) => {
    if (!data?.memberId?.trim()) {
      throw new Error("Missing member id.");
    }
    return { memberId: data.memberId.trim() };
  })
  .handler(async ({ data }): Promise<RefreshMemberSessionResult> => {
    const { findMemberById } = await import("../server/member-auth.server");
    const member = await findMemberById(data.memberId);
    if (!member) {
      throw new Error("Member account not found. Please sign in with Discord again.");
    }

    return {
      memberId: member.id,
      username: member.username,
      discordId: member.discordId ?? null,
      status: member.status,
      registeredAt: member.createdAt,
    };
  });
