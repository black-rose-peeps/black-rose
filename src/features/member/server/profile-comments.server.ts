import type { AdminMember } from "@/features/admin/features/members/types";
import { rowToAdminMember } from "@/features/admin/features/members/utils";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  ProfileComment,
  ProfileCommentAuthor,
  ProfileCommentReply,
  ProfileCommentsPage,
} from "../types/profile-comments";

const MAX_BODY_LENGTH = 500;

interface CommentRow {
  id: string;
  profile_member_id: string;
  author_member_id: string;
  parent_comment_id: string | null;
  body: string;
  is_hidden: boolean;
  created_at: string;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function normalizeBody(body: string): string {
  return body.trim().slice(0, MAX_BODY_LENGTH);
}

async function requireVerifiedMember(memberId: string): Promise<AdminMember> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("members").select("*").eq("id", memberId).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Member not found.");

  const member = rowToAdminMember(data);
  if (member.status !== "Verified") {
    throw new Error("Only verified members can use profile comments.");
  }

  return member;
}

async function requirePublicProfile(memberId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("member_profiles")
    .select("is_public")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profile not found.");
  if (!data.is_public) throw new Error("This profile is not public.");
}

async function loadAuthorMap(memberIds: string[]): Promise<Map<string, ProfileCommentAuthor>> {
  const unique = [...new Set(memberIds.filter(Boolean))];
  if (!unique.length) return new Map();

  const supabase = getSupabaseAdmin();
  const [{ data: members, error: membersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from("members").select("id, username, discord_username").in("id", unique),
      supabase
        .from("member_profiles")
        .select("member_id, slug, display_name, avatar_url")
        .in("member_id", unique),
    ]);

  if (membersError) throw new Error(membersError.message);
  if (profilesError) throw new Error(profilesError.message);

  const profileByMember = new Map(
    (profiles ?? []).map((row) => [row.member_id as string, row]),
  );

  return new Map(
    (members ?? []).map((row) => {
      const memberId = row.id as string;
      const profile = profileByMember.get(memberId);
      const username = row.username as string;
      const displayName = (profile?.display_name as string | undefined)?.trim() || username;

      return [
        memberId,
        {
          memberId,
          slug: (profile?.slug as string) ?? username,
          displayName,
          discordUsername:
            (row.discord_username as string | null | undefined)?.trim() || username,
          avatarUrl: (profile?.avatar_url as string | null) ?? null,
          avatarInitials: initialsFromName(displayName),
        } satisfies ProfileCommentAuthor,
      ];
    }),
  );
}

function groupRepliesByParent(rows: CommentRow[]): Map<string, CommentRow[]> {
  const map = new Map<string, CommentRow[]>();

  for (const row of rows) {
    if (!row.parent_comment_id) continue;
    const list = map.get(row.parent_comment_id) ?? [];
    list.push(row);
    map.set(row.parent_comment_id, list);
  }

  for (const [parentId, list] of map) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    map.set(parentId, list);
  }

  return map;
}

function rowToComment(
  row: CommentRow,
  authors: Map<string, ProfileCommentAuthor>,
  repliesByParent: Map<string, CommentRow[]>,
  includeHidden: boolean,
): ProfileComment | null {
  if (row.parent_comment_id) return null;
  if (row.is_hidden && !includeHidden) return null;

  const author = authors.get(row.author_member_id);
  if (!author) return null;

  const replyRows = repliesByParent.get(row.id) ?? [];
  const replies = replyRows
    .map((replyRow) => {
      const replyAuthor = authors.get(replyRow.author_member_id);
      if (!replyAuthor) return null;

      return {
        id: replyRow.id,
        body: replyRow.body,
        createdAt: replyRow.created_at,
        author: replyAuthor,
        isProfileOwnerReply: replyRow.author_member_id === row.profile_member_id,
      } satisfies ProfileCommentReply;
    })
    .filter((reply): reply is ProfileCommentReply => reply !== null);

  return {
    id: row.id,
    profileMemberId: row.profile_member_id,
    author,
    body: row.body,
    isHidden: row.is_hidden,
    createdAt: row.created_at,
    replies,
  };
}

export async function fetchProfileComments(
  profileMemberId: string,
  viewerMemberId?: string,
  options?: { page?: number; pageSize?: number },
): Promise<ProfileCommentsPage> {
  const isProfileOwner = Boolean(viewerMemberId && viewerMemberId === profileMemberId);
  return fetchProfileCommentsPage(profileMemberId, {
    ...options,
    includeHidden: isProfileOwner,
  });
}

export async function fetchProfileCommentsAsAdmin(
  profileMemberId: string,
  options?: { page?: number; pageSize?: number },
): Promise<ProfileCommentsPage> {
  return fetchProfileCommentsPage(profileMemberId, {
    ...options,
    includeHidden: true,
  });
}

async function fetchProfileCommentsPage(
  profileMemberId: string,
  options?: { page?: number; pageSize?: number; includeHidden?: boolean },
): Promise<ProfileCommentsPage> {
  const supabase = getSupabaseAdmin();
  const includeHidden = Boolean(options?.includeHidden);
  const pageSize = Math.max(1, Math.min(options?.pageSize ?? 10, 50));
  const requestedPage = Math.max(1, options?.page ?? 1);

  let countQuery = supabase
    .from("profile_comments")
    .select("id", { count: "exact", head: true })
    .eq("profile_member_id", profileMemberId)
    .is("parent_comment_id", null);

  if (!includeHidden) {
    countQuery = countQuery.eq("is_hidden", false);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    if (countError.code === "42P01") {
      return { comments: [], total: 0, page: 1, pageSize, totalPages: 1 };
    }
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (total === 0) {
    return { comments: [], total: 0, page: 1, pageSize, totalPages: 1 };
  }

  let dataQuery = supabase
    .from("profile_comments")
    .select("*")
    .eq("profile_member_id", profileMemberId)
    .is("parent_comment_id", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!includeHidden) {
    dataQuery = dataQuery.eq("is_hidden", false);
  }

  const { data, error } = await dataQuery;

  if (error) {
    if (error.code === "42P01") {
      return { comments: [], total: 0, page: 1, pageSize, totalPages: 1 };
    }
    throw new Error(error.message);
  }

  const topLevel = (data ?? []) as CommentRow[];
  const topLevelIds = topLevel.map((row) => row.id);

  let replyRows: CommentRow[] = [];
  if (topLevelIds.length > 0) {
    const { data: replies, error: repliesError } = await supabase
      .from("profile_comments")
      .select("*")
      .in("parent_comment_id", topLevelIds);

    if (repliesError) throw new Error(repliesError.message);
    replyRows = (replies ?? []) as CommentRow[];
    if (!includeHidden) {
      replyRows = replyRows.filter((row) => !row.is_hidden);
    }
  }

  const repliesByParent = groupRepliesByParent(replyRows);

  const authorIds = [...topLevel, ...replyRows].map((row) => row.author_member_id);
  const authors = await loadAuthorMap(authorIds);

  const comments = topLevel
    .map((row) => rowToComment(row, authors, repliesByParent, includeHidden))
    .filter((comment): comment is ProfileComment => comment !== null);

  return { comments, total, page, pageSize, totalPages };
}

export async function createProfileComment(input: {
  authorMemberId: string;
  profileMemberId: string;
  body: string;
}): Promise<ProfileComment> {
  const body = normalizeBody(input.body);
  if (!body) throw new Error("Comment cannot be empty.");

  await requireVerifiedMember(input.authorMemberId);
  await requireVerifiedMember(input.profileMemberId);
  await requirePublicProfile(input.profileMemberId);

  if (input.authorMemberId === input.profileMemberId) {
    throw new Error("You cannot comment on your own profile.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profile_comments")
    .insert({
      profile_member_id: input.profileMemberId,
      author_member_id: input.authorMemberId,
      body,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const authors = await loadAuthorMap([input.authorMemberId]);
  const author = authors.get(input.authorMemberId);
  if (!author) throw new Error("Failed to load comment author.");

  return {
    id: data.id as string,
    profileMemberId: data.profile_member_id as string,
    author,
    body: data.body as string,
    isHidden: false,
    createdAt: data.created_at as string,
    replies: [],
  };
}

export async function replyToProfileComment(input: {
  profileMemberId: string;
  parentCommentId: string;
  authorMemberId: string;
  body: string;
}): Promise<ProfileCommentReply> {
  const body = normalizeBody(input.body);
  if (!body) throw new Error("Reply cannot be empty.");

  await requireVerifiedMember(input.authorMemberId);

  const supabase = getSupabaseAdmin();
  const { data: parent, error: parentError } = await supabase
    .from("profile_comments")
    .select("*")
    .eq("id", input.parentCommentId)
    .maybeSingle();

  if (parentError) throw new Error(parentError.message);
  if (!parent) throw new Error("Comment not found.");
  if (parent.profile_member_id !== input.profileMemberId) {
    throw new Error("Comment does not belong to this profile.");
  }
  if (parent.parent_comment_id) {
    throw new Error("You can only reply to top-level comments.");
  }

  const isOwner = input.authorMemberId === input.profileMemberId;
  const isCommentAuthor = input.authorMemberId === parent.author_member_id;

  if (!isOwner && !isCommentAuthor) {
    throw new Error("Only the profile owner or the original commenter can reply in this thread.");
  }

  if (parent.is_hidden && !isOwner) {
    throw new Error("Cannot reply to a hidden comment.");
  }

  const { data, error } = await supabase
    .from("profile_comments")
    .insert({
      profile_member_id: input.profileMemberId,
      author_member_id: input.authorMemberId,
      parent_comment_id: input.parentCommentId,
      body,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const authors = await loadAuthorMap([input.authorMemberId]);
  const author = authors.get(input.authorMemberId);
  if (!author) throw new Error("Failed to load reply author.");

  return {
    id: data.id as string,
    body: data.body as string,
    createdAt: data.created_at as string,
    author,
    isProfileOwnerReply: isOwner,
  };
}

export async function setProfileCommentHidden(input: {
  profileMemberId: string;
  commentId: string;
  authorMemberId: string;
  hidden: boolean;
}): Promise<void> {
  if (input.authorMemberId !== input.profileMemberId) {
    throw new Error("Only the profile owner can hide comments.");
  }

  await requireVerifiedMember(input.authorMemberId);

  const supabase = getSupabaseAdmin();
  const { data: comment, error: commentError } = await supabase
    .from("profile_comments")
    .select("id, profile_member_id, parent_comment_id")
    .eq("id", input.commentId)
    .maybeSingle();

  if (commentError) throw new Error(commentError.message);
  if (!comment) throw new Error("Comment not found.");
  if (comment.profile_member_id !== input.profileMemberId) {
    throw new Error("Comment does not belong to this profile.");
  }
  if (comment.parent_comment_id) {
    throw new Error("Only top-level comments can be hidden.");
  }

  const { error } = await supabase
    .from("profile_comments")
    .update({
      is_hidden: input.hidden,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.commentId);

  if (error) throw new Error(error.message);
}

async function deleteCommentThread(profileMemberId: string, commentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: comment, error: commentError } = await supabase
    .from("profile_comments")
    .select("id, profile_member_id, parent_comment_id")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) throw new Error(commentError.message);
  if (!comment) throw new Error("Comment not found.");
  if (comment.profile_member_id !== profileMemberId) {
    throw new Error("Comment does not belong to this profile.");
  }

  const threadRootId = (comment.parent_comment_id as string | null) ?? (comment.id as string);

  const { error: rootError } = await supabase
    .from("profile_comments")
    .delete()
    .eq("id", threadRootId);

  if (rootError) throw new Error(rootError.message);
}

export async function deleteProfileCommentByOwner(input: {
  profileMemberId: string;
  commentId: string;
  authorMemberId: string;
}): Promise<void> {
  if (input.authorMemberId !== input.profileMemberId) {
    throw new Error("Only the profile owner can delete comments.");
  }

  await requireVerifiedMember(input.authorMemberId);
  await deleteCommentThread(input.profileMemberId, input.commentId);
}

export async function deleteProfileCommentAsAdmin(input: {
  profileMemberId: string;
  commentId: string;
}): Promise<void> {
  await deleteCommentThread(input.profileMemberId, input.commentId);
}

export interface ProfileCommentAlert {
  commentId: string;
  authorDisplayName: string;
  authorSlug: string;
  bodyPreview: string;
  createdAt: string;
  profileSlug: string;
}

export async function fetchProfileCommentAlertsForMember(
  profileMemberId: string,
): Promise<ProfileCommentAlert[]> {
  await requireVerifiedMember(profileMemberId);

  const supabase = getSupabaseAdmin();
  const [{ data: profile, error: profileError }, { data: comments, error: commentsError }] =
    await Promise.all([
      supabase.from("member_profiles").select("slug").eq("member_id", profileMemberId).maybeSingle(),
      supabase
        .from("profile_comments")
        .select("id, author_member_id, body, created_at")
        .eq("profile_member_id", profileMemberId)
        .is("parent_comment_id", null)
        .eq("is_hidden", false)
        .neq("author_member_id", profileMemberId)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  if (profileError) throw new Error(profileError.message);
  if (commentsError) {
    if (commentsError.code === "42P01") return [];
    throw new Error(commentsError.message);
  }

  const authorIds = [...new Set((comments ?? []).map((row) => row.author_member_id as string))];
  const authors = await loadAuthorMap(authorIds);
  const profileSlug = (profile?.slug as string | undefined)?.trim() || profileMemberId;

  return (comments ?? []).map((row) => {
    const author = authors.get(row.author_member_id as string);
    const body = row.body as string;
    const preview = body.length > 80 ? `${body.slice(0, 77)}…` : body;

    return {
      commentId: row.id as string,
      authorDisplayName: author?.displayName ?? "A member",
      authorSlug: author?.slug ?? "",
      bodyPreview: preview,
      createdAt: row.created_at as string,
      profileSlug,
    };
  });
}
