import { createServerFn } from "@tanstack/react-start";
import type { MemberVerificationStatus } from "@/features/admin/features/members/types";

export interface RefreshMemberAccessInput {
  memberId: string;
}

export interface RefreshMemberAccessResult {
  memberId: string;
  username: string;
  discordUsername: string;
  discordId: string | null;
  status: MemberVerificationStatus;
  registeredAt: string;
}

/** Lightweight session refresh for background access checks — no profile bundle. */
export const refreshMemberAccess = createServerFn({ method: "POST" })
  .validator((data: RefreshMemberAccessInput) => {
    if (!data?.memberId?.trim()) {
      throw new Error("Missing member id.");
    }
    return { memberId: data.memberId.trim() };
  })
  .handler(async ({ data }): Promise<RefreshMemberAccessResult> => {
    const { assertRequestMemberId } = await import("../server/member-session-request.server");
    assertRequestMemberId(data.memberId);

    const { findMemberById } = await import("../server/member-auth.server");
    const member = await findMemberById(data.memberId);
    if (!member) {
      throw new Error("Member account not found. Please sign in with Discord again.");
    }

    return {
      memberId: member.id,
      username: member.username,
      discordUsername: member.discordUsername,
      discordId: member.discordId ?? null,
      status: member.status,
      registeredAt: member.createdAt,
    };
  });
