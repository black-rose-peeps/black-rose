import { createServerFn } from "@tanstack/react-start";
import type { MemberProfile, SocialPlatform } from "../types";

export const fetchMemberProfileBySlug = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; viewerMemberId?: string }) => {
    if (!data?.slug?.trim()) throw new Error("Missing profile slug.");
    return {
      slug: data.slug.trim(),
      viewerMemberId: data.viewerMemberId?.trim() || undefined,
    };
  })
  .handler(async ({ data }): Promise<MemberProfile | null> => {
    const { fetchMemberProfileBySlug } = await import("../server/profile.server");
    return fetchMemberProfileBySlug(data.slug, data.viewerMemberId);
  });

export const fetchMyMemberProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { memberId: string }) => {
    if (!data?.memberId?.trim()) throw new Error("Missing member id.");
    return { memberId: data.memberId.trim() };
  })
  .handler(async ({ data }): Promise<MemberProfile | null> => {
    const { fetchMemberProfileByMemberId } = await import("../server/profile.server");
    return fetchMemberProfileByMemberId(data.memberId);
  });

export interface UpdateMyMemberProfileInput {
  memberId: string;
  displayName: string;
  headline: string;
  bio: string;
  mainGame: string | null;
  mainRole: string;
  region: string;
  isPublic: boolean;
  socialLinks: { platform: SocialPlatform; url: string | null; isPublic: boolean }[];
}

export const updateMyMemberProfile = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateMyMemberProfileInput) => {
    if (!data?.memberId?.trim()) throw new Error("Missing member id.");
    return data;
  })
  .handler(async ({ data }): Promise<MemberProfile> => {
    const { updateMemberProfile } = await import("../server/profile.server");
    return updateMemberProfile(data);
  });
