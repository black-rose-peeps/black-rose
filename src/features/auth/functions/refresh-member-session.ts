import { createServerFn } from "@tanstack/react-start";
import type { MemberVerificationStatus } from "@/features/admin/features/members/types";

export interface RefreshMemberSessionInput {
  memberId: string;
}

export interface RefreshMemberSessionResult {
  memberId: string;
  username: string;
  discordUsername: string;
  displayName: string;
  profileSlug: string | null;
  avatarUrl: string | null;
  discordId: string | null;
  status: MemberVerificationStatus;
  registeredAt: string;
}

export const refreshMemberSession = createServerFn({ method: "POST" })
  .validator((data: RefreshMemberSessionInput) => {
    if (!data?.memberId?.trim()) {
      throw new Error("Missing member id.");
    }
    return { memberId: data.memberId.trim() };
  })
  .handler(async ({ data }): Promise<RefreshMemberSessionResult> => {
    const { assertRequestMemberId } = await import("../server/member-session-request.server");
    assertRequestMemberId(data.memberId);

    const { findMemberById } = await import("../server/member-auth.server");

    const member = await findMemberById(data.memberId);
    if (!member) {
      throw new Error("Member account not found. Please sign in with Discord again.");
    }

    const { fetchMemberProfileByMemberId } = await import(
      "@/features/member/server/profile.server"
    );
    const profile = await fetchMemberProfileByMemberId(member.id, member);

    return {
      memberId: member.id,
      username: member.username,
      discordUsername: member.discordUsername,
      displayName: profile?.displayName ?? member.username,
      profileSlug: profile?.slug ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      discordId: member.discordId ?? null,
      status: member.status,
      registeredAt: member.createdAt,
    };
  });
