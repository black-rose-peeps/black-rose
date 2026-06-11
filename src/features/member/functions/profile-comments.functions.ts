import { createServerFn } from "@tanstack/react-start";
import type { ProfileComment, ProfileCommentReply } from "../types/profile-comments";

export const fetchProfileComments = createServerFn({ method: "POST" })
  .inputValidator((data: { profileMemberId: string; viewerMemberId?: string }) => {
    if (!data?.profileMemberId?.trim()) throw new Error("Missing profile member id.");
    return {
      profileMemberId: data.profileMemberId.trim(),
      viewerMemberId: data.viewerMemberId?.trim() || undefined,
    };
  })
  .handler(async ({ data }): Promise<ProfileComment[]> => {
    const { fetchProfileComments } = await import("../server/profile-comments.server");
    return fetchProfileComments(data.profileMemberId, data.viewerMemberId);
  });

export const createProfileComment = createServerFn({ method: "POST" })
  .inputValidator((data: { authorMemberId: string; profileMemberId: string; body: string }) => {
    if (!data?.authorMemberId?.trim()) throw new Error("Missing author member id.");
    if (!data?.profileMemberId?.trim()) throw new Error("Missing profile member id.");
    return {
      authorMemberId: data.authorMemberId.trim(),
      profileMemberId: data.profileMemberId.trim(),
      body: data.body ?? "",
    };
  })
  .handler(async ({ data }): Promise<ProfileComment> => {
    const { createProfileComment } = await import("../server/profile-comments.server");
    return createProfileComment(data);
  });

export const replyToProfileComment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      profileMemberId: string;
      parentCommentId: string;
      authorMemberId: string;
      body: string;
    }) => {
      if (!data?.profileMemberId?.trim()) throw new Error("Missing profile member id.");
      if (!data?.parentCommentId?.trim()) throw new Error("Missing comment id.");
      if (!data?.authorMemberId?.trim()) throw new Error("Missing author member id.");
      return {
        profileMemberId: data.profileMemberId.trim(),
        parentCommentId: data.parentCommentId.trim(),
        authorMemberId: data.authorMemberId.trim(),
        body: data.body ?? "",
      };
    },
  )
  .handler(async ({ data }): Promise<ProfileCommentReply> => {
    const { replyToProfileComment } = await import("../server/profile-comments.server");
    return replyToProfileComment(data);
  });

export const setProfileCommentHidden = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      profileMemberId: string;
      commentId: string;
      authorMemberId: string;
      hidden: boolean;
    }) => {
      if (!data?.profileMemberId?.trim()) throw new Error("Missing profile member id.");
      if (!data?.commentId?.trim()) throw new Error("Missing comment id.");
      if (!data?.authorMemberId?.trim()) throw new Error("Missing author member id.");
      return {
        profileMemberId: data.profileMemberId.trim(),
        commentId: data.commentId.trim(),
        authorMemberId: data.authorMemberId.trim(),
        hidden: Boolean(data.hidden),
      };
    },
  )
  .handler(async ({ data }): Promise<void> => {
    const { setProfileCommentHidden } = await import("../server/profile-comments.server");
    return setProfileCommentHidden(data);
  });
