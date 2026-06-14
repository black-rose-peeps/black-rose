import {
  createProfileComment as createFn,
  fetchProfileComments as fetchFn,
  fetchProfileCommentAlerts as fetchAlertsFn,
  replyToProfileComment as replyFn,
  setProfileCommentHidden as hideFn,
} from "../functions/profile-comments.functions";
import type { ProfileComment, ProfileCommentReply } from "../types/profile-comments";
import type { ProfileCommentAlert } from "../server/profile-comments.server";

export async function fetchProfileComments(
  profileMemberId: string,
  viewerMemberId?: string,
): Promise<ProfileComment[]> {
  return fetchFn({ data: { profileMemberId, viewerMemberId } });
}

export async function fetchProfileCommentAlerts(input: {
  memberId: string;
}): Promise<ProfileCommentAlert[]> {
  return fetchAlertsFn({ data: input });
}

export async function createProfileComment(input: {
  authorMemberId: string;
  profileMemberId: string;
  body: string;
}): Promise<ProfileComment> {
  return createFn({ data: input });
}

export async function replyToProfileComment(input: {
  profileMemberId: string;
  parentCommentId: string;
  authorMemberId: string;
  body: string;
}): Promise<ProfileCommentReply> {
  return replyFn({ data: input });
}

export async function setProfileCommentHidden(input: {
  profileMemberId: string;
  commentId: string;
  authorMemberId: string;
  hidden: boolean;
}): Promise<void> {
  return hideFn({ data: input });
}
