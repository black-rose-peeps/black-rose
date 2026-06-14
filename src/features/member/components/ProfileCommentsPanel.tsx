import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  EyeOff,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Reply,
  Shield,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getSession } from "@/features/auth/store/session";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { CornerAccents, TechPanel } from "@/features/member/components/MemberShell";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { relativeTime } from "@/features/notifications/utils/relative-time";
import {
  createProfileComment,
  fetchProfileComments,
  replyToProfileComment,
  setProfileCommentHidden,
} from "@/features/member/services/profile-comments.service";
import type { ProfileComment, ProfileCommentReply } from "@/features/member/types/profile-comments";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 500;

export interface ProfileOwnerInfo {
  displayName: string;
  slug: string;
  discordUsername: string;
  avatarUrl: string | null;
  avatarInitials: string;
}

interface ProfileCommentsPanelProps {
  profileMemberId: string;
  isOwnProfile: boolean;
  viewerMemberId?: string;
  viewerIsVerified: boolean;
  profileOwner: ProfileOwnerInfo;
}

function formatCommentDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
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
            Verified members can leave notes here. You can reply once per comment or hide entries
            from your public profile.
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

function OwnerReplyBlock({
  owner,
  reply,
}: {
  owner: ProfileOwnerInfo;
  reply: ProfileCommentReply;
}) {
  return (
    <div className="relative mt-4 pl-5 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-px">
      <div className="relative overflow-hidden p-4">
        <CornerAccents className="" />
        <div className="flex items-start gap-3">
          <MemberAvatar
            avatarUrl={owner.avatarUrl}
            initials={owner.avatarInitials}
            name={owner.displayName}
            className="h-9 w-9 text-xs"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <MemberNameStack
                displayName={owner.displayName}
                discordUsername={owner.discordUsername}
                size="sm"
              />
              <Badge
                variant="outline"
                className="rounded-none border-emerald-400/25 bg-emerald-400/10 font-tech text-label-readable uppercase text-emerald-400"
              >
                <Shield className="mr-1 h-2.5 w-2.5" />
                Profile Owner
              </Badge>
              <span
                className="font-tech text-label-readable uppercase text-muted-foreground/50"
                title={formatCommentDate(reply.createdAt)}
              >
                {relativeTime(reply.createdAt)}
              </span>
            </div>
            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {reply.body}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  isOwnProfile,
  profileOwner,
  replyingId,
  replyDraft,
  replyPosting,
  actionId,
  onHide,
  onToggleReply,
  onReplyDraftChange,
  onReply,
  onCancelReply,
}: {
  comment: ProfileComment;
  isOwnProfile: boolean;
  profileOwner: ProfileOwnerInfo;
  replyingId: string | null;
  replyDraft: string;
  replyPosting: boolean;
  actionId: string | null;
  onHide: (commentId: string, hidden: boolean) => void;
  onToggleReply: (commentId: string) => void;
  onReplyDraftChange: (value: string) => void;
  onReply: (commentId: string) => void;
  onCancelReply: () => void;
}) {
  const isReplying = replyingId === comment.id;

  return (
    <li
      className={cn(
        "relative overflow-hidden border border-white/8 p-4 sm:p-5",
        comment.isHidden ? "bg-white/[0.01] opacity-80" : "bg-white/[0.02]",
      )}
    >
      <CornerAccents />
      <div className="flex items-start gap-3 sm:gap-4">
        <Link
          to="/members/$slug"
          params={{ slug: comment.author.slug }}
          className="shrink-0 transition hover:opacity-90"
        >
          <MemberAvatar
            avatarUrl={comment.author.avatarUrl}
            initials={comment.author.avatarInitials}
            name={comment.author.displayName}
            className="h-11 w-11 text-sm"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <Link
              to="/members/$slug"
              params={{ slug: comment.author.slug }}
              className="min-w-0 transition hover:text-foreground"
            >
              <MemberNameStack
                displayName={comment.author.displayName}
                discordUsername={comment.author.discordUsername}
                size="sm"
              />
            </Link>
            <time
              className="shrink-0 font-tech text-label-readable uppercase text-muted-foreground/60"
              dateTime={comment.createdAt}
              title={formatCommentDate(comment.createdAt)}
            >
              {relativeTime(comment.createdAt)}
            </time>
          </div>

          {comment.isHidden && isOwnProfile && (
            <span className="mt-2 inline-flex items-center gap-1 border border-amber-400/20 bg-amber-400/5 px-2 py-0.5 font-tech text-label-readable uppercase text-amber-400">
              <EyeOff className="h-2.5 w-2.5" />
              Hidden from public
            </span>
          )}

          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {comment.body}
          </p>

          {comment.reply && <OwnerReplyBlock owner={profileOwner} reply={comment.reply} />}

          {isOwnProfile && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={actionId === comment.id}
                onClick={() => onHide(comment.id, !comment.isHidden)}
                className="clip-cta inline-flex h-9 items-center gap-1.5 rounded-none border-white/12 bg-white/5 font-tech text-ui-readable uppercase"
              >
                {actionId === comment.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
                {comment.isHidden ? "Unhide" : "Hide"}
              </Button>

              {!comment.reply && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleReply(comment.id)}
                  className={cn(
                    "clip-cta inline-flex h-9 items-center gap-1.5 rounded-none border-white/12 bg-white/5 font-tech text-ui-readable uppercase",
                    isReplying && "border-white/25 bg-white/10 text-foreground",
                  )}
                >
                  <Reply className="h-3 w-3" />
                  {isReplying ? "Cancel Reply" : "Reply"}
                </Button>
              )}
            </div>
          )}

          {isOwnProfile && isReplying && !comment.reply && (
            <div className="relative mt-4 overflow-hidden border border-white/10 bg-white/[0.03] p-4">
              <CornerAccents />
              <p className="mb-3 font-tech text-label-readable uppercase text-muted-foreground">
                Your reply
              </p>
              <Textarea
                value={replyDraft}
                onChange={(e) => onReplyDraftChange(e.target.value.slice(0, MAX_LENGTH))}
                placeholder={`Reply as ${profileOwner.displayName}…`}
                rows={3}
                autoFocus
                className="min-h-[88px] resize-none rounded-none border-white/12 bg-white/[0.03] shadow-none focus-visible:ring-white/20"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-tech text-label-readable uppercase text-muted-foreground/60">
                  {replyDraft.length}/{MAX_LENGTH}
                </span>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onCancelReply}
                    className="rounded-none font-tech text-ui-readable uppercase"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={replyPosting || !replyDraft.trim()}
                    onClick={() => onReply(comment.id)}
                    className="clip-cta inline-flex h-9 items-center gap-1.5 rounded-none bg-white px-4 font-tech text-ui-readable uppercase text-black hover:bg-white/90 disabled:opacity-50"
                  >
                    {replyPosting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    {replyPosting ? "Posting…" : "Post Reply"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const isLoggedIn = Boolean(viewerMemberId);
  const canComment = viewerIsVerified && isLoggedIn && !isOwnProfile;
  const showGuestCTA = !isOwnProfile && !canComment;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfileComments(profileMemberId, viewerMemberId);
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [profileMemberId, viewerMemberId]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
      setComments((prev) => [created, ...prev]);
      setDraft("");
      setComposerOpen(false);
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
      await reload();
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
        prev.map((comment) => (comment.id === parentCommentId ? { ...comment, reply } : comment)),
      );
      setReplyingId(null);
      setReplyDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply.");
    } finally {
      setReplyPosting(false);
    }
  }

  function handleToggleReply(commentId: string) {
    if (replyingId === commentId) {
      setReplyingId(null);
      setReplyDraft("");
      return;
    }
    setReplyingId(commentId);
    setReplyDraft("");
  }

  const visibleCount = comments.filter((c) => !c.isHidden || isOwnProfile).length;

  return (
    <TechPanel
      label="Community"
      title={
        loading
          ? "Profile Comments"
          : visibleCount > 0
            ? `Profile Comments · ${visibleCount}`
            : "Profile Comments"
      }
      icon={<MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />}
    >
      <div className="flex flex-col gap-5">
        {isOwnProfile && <OwnerModerationHint />}

        {canComment && (comments.length > 0 || composerOpen) && (
          <CommentComposer
            draft={draft}
            posting={posting}
            composerOpen={composerOpen}
            hasComments={comments.length > 0}
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
        ) : comments.length === 0 && !(canComment && composerOpen) ? (
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
        ) : comments.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isOwnProfile={isOwnProfile}
                profileOwner={profileOwner}
                replyingId={replyingId}
                replyDraft={replyDraft}
                replyPosting={replyPosting}
                actionId={actionId}
                onHide={(id, hidden) => void handleHide(id, hidden)}
                onToggleReply={handleToggleReply}
                onReplyDraftChange={setReplyDraft}
                onReply={(id) => void handleReply(id)}
                onCancelReply={() => {
                  setReplyingId(null);
                  setReplyDraft("");
                }}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </TechPanel>
  );
}
