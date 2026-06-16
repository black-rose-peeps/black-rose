import { createServerFn } from "@tanstack/react-start";
import type {
  ProfileComment,
  ProfileCommentReply,
  ProfileCommentsPage,
} from "../types/profile-comments";

export const fetchProfileComments = createServerFn({ method: "POST" })
  .validator(
    (data: {
      profileMemberId: string;
      viewerMemberId?: string;
      page?: number;
      pageSize?: number;
    }) => {
      if (!data?.profileMemberId?.trim()) throw new Error("Missing profile member id.");
      return {
        profileMemberId: data.profileMemberId.trim(),
        viewerMemberId: data.viewerMemberId?.trim() || undefined,
        page: data.page,
        pageSize: data.pageSize,
      };
    },
  )
  .handler(async ({ data }): Promise<ProfileCommentsPage> => {
    const { fetchProfileComments } = await import("../server/profile-comments.server");
    return fetchProfileComments(data.profileMemberId, data.viewerMemberId, {
      page: data.page,
      pageSize: data.pageSize,
    });
  });

export const createProfileComment = createServerFn({ method: "POST" })
  .validator((data: { authorMemberId: string; profileMemberId: string; body: string }) => {
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
  .validator(
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
  .validator(
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

export const fetchProfileCommentAlerts = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => {
    if (!data?.memberId?.trim()) throw new Error("Missing member id.");
    return { memberId: data.memberId.trim() };
  })
  .handler(async ({ data }) => {
    const { fetchProfileCommentAlertsForMember } =
      await import("../server/profile-comments.server");
    return fetchProfileCommentAlertsForMember(data.memberId);
  });

export const fetchProfileCommentsAsAdmin = createServerFn({ method: "POST" })
  .validator((data: { profileMemberId: string; page?: number; pageSize?: number }) => {
    if (!data?.profileMemberId?.trim()) throw new Error("Missing profile member id.");
    return {
      profileMemberId: data.profileMemberId.trim(),
      page: data.page,
      pageSize: data.pageSize,
    };
  })
  .handler(async ({ data }): Promise<ProfileCommentsPage> => {
    const { fetchProfileCommentsAsAdmin } = await import("../server/profile-comments.server");
    return fetchProfileCommentsAsAdmin(data.profileMemberId, {
      page: data.page,
      pageSize: data.pageSize,
    });
  });

export const deleteProfileCommentByOwner = createServerFn({ method: "POST" })
  .validator((data: { profileMemberId: string; commentId: string; authorMemberId: string }) => {
    if (!data?.profileMemberId?.trim()) throw new Error("Missing profile member id.");
    if (!data?.commentId?.trim()) throw new Error("Missing comment id.");
    if (!data?.authorMemberId?.trim()) throw new Error("Missing author member id.");
    return {
      profileMemberId: data.profileMemberId.trim(),
      commentId: data.commentId.trim(),
      authorMemberId: data.authorMemberId.trim(),
    };
  })
  .handler(async ({ data }): Promise<void> => {
    const { deleteProfileCommentByOwner } = await import("../server/profile-comments.server");
    return deleteProfileCommentByOwner(data);
  });

export const deleteProfileCommentAsAdmin = createServerFn({ method: "POST" })
  .validator((data: { profileMemberId: string; commentId: string }) => {
    if (!data?.profileMemberId?.trim()) throw new Error("Missing profile member id.");
    if (!data?.commentId?.trim()) throw new Error("Missing comment id.");
    return {
      profileMemberId: data.profileMemberId.trim(),
      commentId: data.commentId.trim(),
    };
  })
  .handler(async ({ data }): Promise<void> => {
    const { deleteProfileCommentAsAdmin } = await import("../server/profile-comments.server");
    return deleteProfileCommentAsAdmin(data);
  });
