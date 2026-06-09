import {
  fetchMemberProfileBySlug as fetchBySlugFn,
  fetchMyMemberProfile as fetchMyFn,
  updateMyMemberProfile as updateFn,
  type UpdateMyMemberProfileInput,
} from "../functions/member-profile.functions";
import type { MemberProfile } from "../types";

export async function fetchMemberProfileBySlug(
  slug: string,
  viewerMemberId?: string,
): Promise<MemberProfile | null> {
  return fetchBySlugFn({ data: { slug, viewerMemberId } });
}

export async function fetchMemberProfileById(memberId: string): Promise<MemberProfile | null> {
  return fetchMyFn({ data: { memberId } });
}

export async function updateMemberProfile(input: UpdateMyMemberProfileInput): Promise<MemberProfile> {
  return updateFn({ data: input });
}
