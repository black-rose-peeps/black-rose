import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EyeOff, Loader2, MessageSquare, MessageSquarePlus, Shield, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdaptiveAlertDialog,
  AdaptiveAlertDialogAction,
  AdaptiveAlertDialogCancel,
  AdaptiveAlertDialogContent,
  AdaptiveAlertDialogDescription,
  AdaptiveAlertDialogFooter,
  AdaptiveAlertDialogHeader,
  AdaptiveAlertDialogTitle,
} from "@/components/ui/adaptive-alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getSession } from "@/features/auth/store/session";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import {
  ProfileCommentThread,
  type ProfileOwnerInfo,
} from "@/features/member/components/ProfileCommentThread";
import { CornerAccents, TechPanel } from "@/features/member/components/MemberShell";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import {
  createProfileComment,
  deleteProfileCommentByAuthor,
  deleteProfileCommentByOwner,
  fetchProfileComments,
  replyToProfileComment,
  setProfileCommentHidden,
  updateProfileComment,
} from "@/features/member/services/profile-comments.service";
import type { ProfileComment } from "@/features/member/types/profile-comments";
import { clampPage, pageNumbers } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 500;
const PAGE_SIZE = 5;

export type { ProfileOwnerInfo };

interface ProfileCommentsPanelProps {
  profileMemberId: string;
  isOwnProfile: boolean;
  viewerMemberId?: string;
  viewerIsVerified: boolean;
  profileOwner: ProfileOwnerInfo;
}

function CommentsLoadingSkeleton() {
  return (
    <ul className="flex flex-col gap-4" aria-busy="true" aria-label="Loading comments">
      {[0, 1, 2].map((i) => (
        <li key={i} className="border border-white/8 bg-white/[0.02] p-4">
          <div className="flex gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-none bg-white/8" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-36 rounded-none bg-white/8" />
                <Skeleton className="h-3 w-16 rounded-none bg-white/5" />
              </div>
              <Skeleton className="h-3 w-full max-w-md rounded-none bg-white/5" />
              <Skeleton className="h-3 w-2/3 rounded-none bg-white/5" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function GuestCommentCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="relative overflow-hidden border border-white/8 bg-white/[0.02] px-5 py-4">
      <CornerAccents />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-white/10 bg-white/[0.04] text-muted-foreground/50">
            <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isLoggedIn ? "Verification required" : "Join the conversation"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isLoggedIn
                ? "Only verified members can leave profile comments."
                : "Sign in as a verified member to leave a note on this profile."}
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="clip-cta shrink-0 inline-flex h-11 items-center rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase"
        >
          <Link to={isLoggedIn ? "/waitlist" : "/login"}>
            {isLoggedIn ? "View Waitlist" : "Sign In"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function OwnerModerationHint() {
  return (
    <div className="relative overflow-hidden px-5 py-4">
      <CornerAccents />
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
          <Shield className="h-4 w-4" strokeWidth={1.5} />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">Your comment wall</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Verified members can leave notes here. Anyone verified can join the thread — hide or
            delete entries from your public profile anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

function CommentComposer({
  draft,
  posting,
  composerOpen,
  hasComments,
  onDraftChange,
  onPost,
  onOpen,
  onClose,
}: {
  draft: string;
  posting: boolean;
  composerOpen: boolean;
  hasComments: boolean;
  onDraftChange: (value: string) => void;
  onPost: () => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const session = getSession();
  const initials = session?.displayName.slice(0, 2).toUpperCase() ?? "??";
  const showComposer = composerOpen || !hasComments;

  if (!showComposer) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group relative flex w-full items-center justify-between gap-4 overflow-hidden border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
      >
        <CornerAccents />
        <div className="flex min-w-0 items-center gap-3">
          <MemberAvatar
            avatarUrl={session?.avatarUrl ?? null}
            initials={initials}
            name={session?.displayName}
            className="h-10 w-10 text-sm"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Leave a comment</p>
            <p className="text-sm text-muted-foreground">Share a note with this member…</p>
          </div>
        </div>
        <span className="clip-cta inline-flex h-10 shrink-0 items-center gap-2 border border-white/15 bg-white/5 px-4 font-tech text-ui-readable uppercase text-foreground transition group-hover:border-white/25 group-hover:bg-white/8">
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Write
        </span>
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <CornerAccents />
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-tech text-label-readable uppercase text-muted-foreground">
          Leave a comment
        </p>
        {hasComments && (
          <button
            type="button"
            onClick={onClose}
            className="font-tech text-label-readable uppercase text-muted-foreground/60 transition hover:text-muted-foreground"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="flex gap-3 sm:gap-4">
        <MemberAvatar
          avatarUrl={session?.avatarUrl ?? null}
          initials={initials}
          name={session?.displayName}
          className="hidden h-11 w-11 shrink-0 text-sm sm:grid"
        />
        <div className="min-w-0 flex-1">
          <Textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Say something about this member…"
            rows={4}
            autoFocus={composerOpen}
            className="min-h-[104px] resize-none rounded-none border-white/12 bg-white/[0.03] shadow-none focus-visible:ring-white/20"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span
              className={cn(
                "font-tech text-label-readable uppercase",
                draft.length >= MAX_LENGTH - 20 ? "text-amber-400" : "text-muted-foreground/60",
              )}
            >
              {draft.length}/{MAX_LENGTH}
            </span>
            <Button
              type="button"
              disabled={posting || !draft.trim()}
              onClick={onPost}
              className="clip-cta inline-flex h-11 items-center gap-2 rounded-none bg-white px-5 font-tech text-ui-readable uppercase text-black hover:bg-white/90 disabled:opacity-50"
            >
              {posting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {posting ? "Posting…" : "Post Comment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileCommentsPagination({
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-tech text-label-readable uppercase text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {total}
      </p>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="clip-cta h-11 rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
            </PaginationItem>

            {pageNumbers(page, totalPages).map((p, index) =>
              p === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`} className="hidden sm:list-item">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p} className="hidden sm:list-item">
                  <Button
                    type="button"
                    variant={p === page ? "default" : "ghost"}
                    size="icon"
                    className="touch-target h-11 w-11 rounded-none font-tech text-xs sm:h-8 sm:w-8"
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </Button>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="clip-cta h-11 rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

export function ProfileCommentsPanel({
  profileMemberId,
  isOwnProfile,
  viewerMemberId,
  viewerIsVerified,
  profileOwner,
}: ProfileCommentsPanelProps) {
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editPosting, setEditPosting] = useState(false);

  const isLoggedIn = Boolean(viewerMemberId);
  const canComment = viewerIsVerified && isLoggedIn && !isOwnProfile;
  const showGuestCTA = !isOwnProfile && !canComment;

  useEffect(() => {
    setPage(1);
  }, [profileMemberId]);

  const loadPage = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProfileComments(profileMemberId, viewerMemberId, {
          page: pageToLoad,
          pageSize: PAGE_SIZE,
        });
        setComments(data.comments);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load comments.");
        setComments([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [profileMemberId, viewerMemberId],
  );

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const visibleComments = comments.filter((comment) => !comment.isHidden || isOwnProfile);
  const hasComments = total > 0;

  function handlePageChange(nextPage: number) {
    setPage(clampPage(nextPage, totalPages));
  }

  async function handlePost() {
    if (!viewerMemberId || !draft.trim()) return;

    setPosting(true);
    setError(null);
    try {
      const created = await createProfileComment({
        authorMemberId: viewerMemberId,
        profileMemberId,
        body: draft,
      });
      setDraft("");
      setComposerOpen(false);
      if (page === 1) {
        setComments((prev) => [created, ...prev].slice(0, PAGE_SIZE));
        setTotal((prev) => {
          const nextTotal = prev + 1;
          setTotalPages(Math.max(1, Math.ceil(nextTotal / PAGE_SIZE)));
          return nextTotal;
        });
      } else {
        setPage(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  }

  async function handleHide(commentId: string, hidden: boolean) {
    if (!viewerMemberId) return;

    setActionId(commentId);
    setError(null);
    try {
      await setProfileCommentHidden({
        profileMemberId,
        commentId,
        authorMemberId: viewerMemberId,
        hidden,
      });
      await loadPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update comment.");
    } finally {
      setActionId(null);
    }
  }

  async function handleReply(parentCommentId: string) {
    if (!viewerMemberId || !replyDraft.trim()) return;

    setReplyPosting(true);
    setError(null);
    try {
      const reply = await replyToProfileComment({
        profileMemberId,
        parentCommentId,
        authorMemberId: viewerMemberId,
        body: replyDraft,
      });
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === parentCommentId
            ? { ...comment, replies: [...comment.replies, reply] }
            : comment,
        ),
      );
      setReplyingId(null);
      setReplyDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply.");
    } finally {
      setReplyPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!viewerMemberId) return;

    const asRoot = comments.find((c) => c.id === commentId);
    let itemAuthorId: string | undefined;

    if (asRoot) {
      itemAuthorId = asRoot.author.memberId;
    } else {
      for (const comment of comments) {
        const reply = comment.replies.find((r) => r.id === commentId);
        if (reply) {
          itemAuthorId = reply.author.memberId;
          break;
        }
      }
    }

    const isAuthor = itemAuthorId === viewerMemberId;
    const isOwnerThreadDelete =
      isOwnProfile &&
      viewerMemberId === profileMemberId &&
      Boolean(asRoot && asRoot.author.memberId !== viewerMemberId);

    setActionId(commentId);
    setError(null);
    try {
      if (isAuthor) {
        await deleteProfileCommentByAuthor({
          profileMemberId,
          commentId,
          authorMemberId: viewerMemberId,
        });
        if (asRoot) {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
          setTotal((prev) => Math.max(0, prev - 1));
        } else {
          setComments((prev) =>
            prev.map((comment) => ({
              ...comment,
              replies: comment.replies.filter((reply) => reply.id !== commentId),
            })),
          );
        }
      } else if (isOwnerThreadDelete) {
        await deleteProfileCommentByOwner({
          profileMemberId,
          commentId,
          authorMemberId: viewerMemberId,
        });
        await loadPage(page);
      } else {
        throw new Error("You do not have permission to delete this comment.");
      }

      setDeleteTargetId(null);
      setEditingId((current) => (current === commentId ? null : current));
      setReplyingId((current) => (current === commentId ? null : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment.");
    } finally {
      setActionId(null);
    }
  }

  function deleteDialogDescription(): string {
    if (!deleteTargetId) {
      return "This permanently removes the comment. This cannot be undone.";
    }

    const asRoot = comments.find((c) => c.id === deleteTargetId);
    if (asRoot) {
      const isAuthor = asRoot.author.memberId === viewerMemberId;
      if (isAuthor && asRoot.replies.length > 0) {
        return "This permanently removes your comment and all replies in this thread. This cannot be undone.";
      }
      if (isAuthor) {
        return "This permanently removes your comment. This cannot be undone.";
      }
      return "This permanently removes the comment and any reply in the thread. This cannot be undone.";
    }

    return "This permanently removes your reply. This cannot be undone.";
  }

  function handleToggleReply(commentId: string) {
    if (replyingId === commentId) {
      setReplyingId(null);
      setReplyDraft("");
      return;
    }
    setEditingId(null);
    setEditDraft("");
    setReplyingId(commentId);
    setReplyDraft("");
  }

  function handleStartEdit(commentId: string, body: string) {
    setReplyingId(null);
    setReplyDraft("");
    setEditingId(commentId);
    setEditDraft(body);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function handleSaveEdit(commentId: string) {
    if (!viewerMemberId || !editDraft.trim()) return;

    setEditPosting(true);
    setActionId(commentId);
    setError(null);
    try {
      const updated = await updateProfileComment({
        profileMemberId,
        commentId,
        authorMemberId: viewerMemberId,
        body: editDraft,
      });
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            return { ...comment, body: updated.body };
          }
          return {
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === commentId ? { ...reply, body: updated.body } : reply,
            ),
          };
        }),
      );
      setEditingId(null);
      setEditDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update comment.");
    } finally {
      setEditPosting(false);
      setActionId(null);
    }
  }

  return (
    <TechPanel
      label="Community"
      title={
        loading
          ? "Profile Comments"
          : total > 0
            ? `Profile Comments · ${total}`
            : "Profile Comments"
      }
      icon={<MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />}
    >
      <div className="flex flex-col gap-5">
        {isOwnProfile && <OwnerModerationHint />}

        {canComment && (hasComments || composerOpen) && (
          <CommentComposer
            draft={draft}
            posting={posting}
            composerOpen={composerOpen}
            hasComments={hasComments}
            onDraftChange={setDraft}
            onPost={() => void handlePost()}
            onOpen={() => setComposerOpen(true)}
            onClose={() => {
              setComposerOpen(false);
              setDraft("");
            }}
          />
        )}

        {showGuestCTA && <GuestCommentCTA isLoggedIn={isLoggedIn} />}

        {error && (
          <div className="border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <CommentsLoadingSkeleton />
        ) : !hasComments && !(canComment && composerOpen) ? (
          <ArenaEmptyState
            embedded
            eyebrow="Profile Comments"
            title={
              <>
                No comments <span className="text-stroke">yet.</span>
              </>
            }
            description={
              canComment
                ? "Be the first to leave a note on this profile."
                : isOwnProfile
                  ? "When other verified members comment, they will appear here."
                  : "This profile has no public comments yet."
            }
            actions={
              canComment && !composerOpen ? (
                <Button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="clip-cta inline-flex h-11 items-center gap-2 rounded-none bg-white px-5 font-tech text-ui-readable uppercase text-black hover:bg-white/90"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Leave a Comment
                </Button>
              ) : undefined
            }
          />
        ) : hasComments ? (
          <>
            <ul className="flex flex-col gap-4">
              {visibleComments.map((comment) => (
                <ProfileCommentThread
                  key={comment.id}
                  comment={comment}
                  profileMemberId={profileMemberId}
                  profileOwner={profileOwner}
                  viewerMemberId={viewerMemberId}
                  viewerIsVerified={viewerIsVerified}
                  showModeration={isOwnProfile}
                  replyingId={replyingId}
                  replyDraft={replyDraft}
                  replyPosting={replyPosting}
                  editingId={editingId}
                  editDraft={editDraft}
                  editPosting={editPosting}
                  actionId={actionId}
                  onHide={(id, hidden) => void handleHide(id, hidden)}
                  onDelete={(id) => setDeleteTargetId(id)}
                  onToggleReply={handleToggleReply}
                  onReplyDraftChange={setReplyDraft}
                  onReply={(id) => void handleReply(id)}
                  onCancelReply={() => {
                    setReplyingId(null);
                    setReplyDraft("");
                  }}
                  onStartEdit={handleStartEdit}
                  onEditDraftChange={setEditDraft}
                  onSaveEdit={(id) => void handleSaveEdit(id)}
                  onCancelEdit={handleCancelEdit}
                />
              ))}
            </ul>
            <ProfileCommentsPagination
              page={page}
              totalPages={totalPages}
              total={total}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={handlePageChange}
            />
          </>
        ) : null}

        <AdaptiveAlertDialog
          open={deleteTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetId(null);
          }}
        >
          <AdaptiveAlertDialogContent>
            <AdaptiveAlertDialogHeader>
              <AdaptiveAlertDialogTitle>Delete comment?</AdaptiveAlertDialogTitle>
              <AdaptiveAlertDialogDescription>
                {deleteDialogDescription()}
              </AdaptiveAlertDialogDescription>
            </AdaptiveAlertDialogHeader>
            <AdaptiveAlertDialogFooter>
              <AdaptiveAlertDialogCancel className="rounded-none font-tech text-ui-readable uppercase">
                Cancel
              </AdaptiveAlertDialogCancel>
              <AdaptiveAlertDialogAction
                className="clip-cta rounded-none bg-red-500 font-tech text-ui-readable uppercase text-white hover:bg-red-500/90"
                onClick={() => {
                  if (deleteTargetId) void handleDelete(deleteTargetId);
                }}
              >
                Delete
              </AdaptiveAlertDialogAction>
            </AdaptiveAlertDialogFooter>
          </AdaptiveAlertDialogContent>
        </AdaptiveAlertDialog>
      </div>
    </TechPanel>
  );
}
