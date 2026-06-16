import {
  createProfileComment as createFn,
  fetchProfileComments as fetchFn,
  fetchProfileCommentsAsAdmin as fetchAdminFn,
  fetchProfileCommentAlerts as fetchAlertsFn,
  replyToProfileComment as replyFn,
  setProfileCommentHidden as hideFn,
  deleteProfileCommentByOwner as deleteOwnerFn,
  deleteProfileCommentAsAdmin as deleteAdminFn,
} from "../functions/profile-comments.functions";
import type {
  ProfileComment,
  ProfileCommentReply,
  ProfileCommentsPage,
} from "../types/profile-comments";
import type { ProfileCommentAlert } from "../server/profile-comments.server";

export async function fetchProfileComments(
  profileMemberId: string,
  viewerMemberId?: string,
  options?: { page?: number; pageSize?: number },
): Promise<ProfileCommentsPage> {
  return fetchFn({ data: { profileMemberId, viewerMemberId, ...options } });
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

export async function fetchProfileCommentsAsAdmin(
  profileMemberId: string,
  options?: { page?: number; pageSize?: number },
): Promise<ProfileCommentsPage> {
  return fetchAdminFn({ data: { profileMemberId, ...options } });
}

export async function deleteProfileCommentByOwner(input: {
  profileMemberId: string;
  commentId: string;
  authorMemberId: string;
}): Promise<void> {
  return deleteOwnerFn({ data: input });
}

export async function deleteProfileCommentAsAdmin(input: {
  profileMemberId: string;
  commentId: string;
}): Promise<void> {
  return deleteAdminFn({ data: input });
}
