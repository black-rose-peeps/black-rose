import { getMemberBySlug, getMemberProfileByUserId } from "@/lib/mock-member";
import type { MemberProfile } from "../types";

/** Member dashboard/profile — mock data until profile API is ready. */
export async function fetchMemberProfileBySlug(slug: string): Promise<MemberProfile | null> {
  return getMemberBySlug(slug);
}

export async function fetchMemberProfileById(id: string): Promise<MemberProfile | null> {
  return getMemberProfileByUserId(id);
}
