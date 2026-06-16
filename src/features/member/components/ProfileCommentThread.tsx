import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  EyeOff,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Reply,
  Shield,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { CornerAccents } from "@/features/member/components/MemberShell";
import { relativeTime } from "@/features/notifications/utils/relative-time";
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

function ReplyComposer({
  draft,
  posting,
  placeholder,
  onDraftChange,
  onCancel,
  onSubmit,
}: {
  draft: string;
  posting: boolean;
  placeholder: string;
  onDraftChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="relative overflow-hidden border border-white/10 bg-white/[0.03] p-4">
      <CornerAccents />
      <p className="mb-3 font-tech text-label-readable uppercase text-muted-foreground">
        Your reply
      </p>
      <Textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value.slice(0, MAX_LENGTH))}
        placeholder={placeholder}
        rows={3}
        autoFocus
        className="min-h-[88px] resize-none rounded-none border-white/12 bg-white/[0.03] shadow-none focus-visible:ring-white/20"
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-tech text-label-readable uppercase text-muted-foreground/60">
          {draft.length}/{MAX_LENGTH}
        </span>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="rounded-none font-tech text-ui-readable uppercase"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={posting || !draft.trim()}
            onClick={onSubmit}
            className="clip-cta inline-flex h-9 items-center gap-1.5 rounded-none bg-white px-4 font-tech text-ui-readable uppercase text-black hover:bg-white/90 disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {posting ? "Posting…" : "Post Reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ThreadMoreMenu({
  showHide,
  isHidden,
  loading,
  onHide,
  onDelete,
}: {
  showHide: boolean;
  isHidden: boolean;
  loading: boolean;
  onHide?: () => void;
  onDelete?: () => void;
}) {
  if (!onHide && !onDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={loading}
          className="h-8 w-8 shrink-0 rounded-none text-muted-foreground hover:bg-white/8 hover:text-foreground"
          aria-label="More actions"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MoreHorizontal className="h-3.5 w-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[10rem] rounded-none border-white/12 bg-[oklch(0.09_0_0)]"
      >
        {showHide && onHide && (
          <DropdownMenuItem
            onClick={onHide}
            className="rounded-none font-tech text-ui-readable uppercase focus:bg-white/8"
          >
            <EyeOff className="mr-2 h-3.5 w-3.5" />
            {isHidden ? "Unhide" : "Hide"}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            {showHide && onHide && <DropdownMenuSeparator className="bg-white/8" />}
            <DropdownMenuItem
              onClick={onDelete}
              className="rounded-none font-tech text-ui-readable uppercase text-red-400 focus:bg-red-400/10 focus:text-red-400"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThreadActionButtons({
  showReply,
  isReplying,
  showMore,
  showHide,
  isHidden,
  loading,
  onReplyClick,
  onHide,
  onDelete,
}: {
  showReply: boolean;
  isReplying: boolean;
  showMore: boolean;
  showHide: boolean;
  isHidden: boolean;
  loading: boolean;
  onReplyClick?: () => void;
  onHide?: () => void;
  onDelete?: () => void;
}) {
  if (!showReply && !showMore) return null;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {showReply && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReplyClick}
          className={cn(
            "h-8 w-8 rounded-none text-muted-foreground hover:bg-white/8 hover:text-foreground",
            isReplying && "bg-white/10 text-foreground",
          )}
          aria-label={isReplying ? "Cancel reply" : "Reply"}
        >
          <Reply className="h-3.5 w-3.5" />
        </Button>
      )}
      {showMore && (
        <ThreadMoreMenu
          showHide={showHide}
          isHidden={isHidden}
          loading={loading}
          onHide={onHide}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function ThreadReplyMessage({
  reply,
  showReply,
  isReplying,
  showMore,
  showHide,
  isThreadHidden,
  loading,
  onReplyClick,
  onHide,
  onDelete,
}: {
  reply: ProfileCommentReply;
  showReply: boolean;
  isReplying: boolean;
  showMore: boolean;
  showHide: boolean;
  isThreadHidden: boolean;
  loading: boolean;
  onReplyClick?: () => void;
  onHide?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="relative flex items-start gap-3 pl-4 sm:gap-4">
      <span aria-hidden className="absolute bottom-2 left-0 top-0 w-px bg-white/15" />
      <Link
        to="/members/$slug"
        params={{ slug: reply.author.slug }}
        className="shrink-0 transition hover:opacity-90"
      >
        <MemberAvatar
          avatarUrl={reply.author.avatarUrl}
          initials={reply.author.avatarInitials}
          name={reply.author.displayName}
          className="h-9 w-9 text-xs"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <MemberNameStack
              displayName={reply.author.displayName}
              discordUsername={reply.author.discordUsername}
              profileSlug={reply.author.slug}
              size="sm"
            />
            {reply.isProfileOwnerReply && (
              <Badge
                variant="outline"
                className="rounded-none border-emerald-400/25 bg-emerald-400/10 font-tech text-label-readable uppercase text-emerald-400"
              >
                <Shield className="mr-1 h-2.5 w-2.5" />
                Profile Owner
              </Badge>
            )}
            <time
              className="font-tech text-label-readable uppercase text-muted-foreground/50"
              dateTime={reply.createdAt}
              title={formatCommentDate(reply.createdAt)}
            >
              {relativeTime(reply.createdAt)}
            </time>
          </div>
          <ThreadActionButtons
            showReply={showReply}
            isReplying={isReplying}
            showMore={showMore}
            showHide={showHide}
            isHidden={isThreadHidden}
            loading={loading}
            onReplyClick={onReplyClick}
            onHide={onHide}
            onDelete={onDelete}
          />
        </div>
        <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {reply.body}
        </p>
      </div>
    </article>
  );
}

export interface ProfileCommentThreadProps {
  comment: ProfileComment;
  profileMemberId: string;
  profileOwner?: ProfileOwnerInfo;
  viewerMemberId?: string;
  showModeration?: boolean;
  showAdminActions?: boolean;
  replyingId?: string | null;
  replyDraft?: string;
  replyPosting?: boolean;
  actionId?: string | null;
  onHide?: (commentId: string, hidden: boolean) => void;
  onDelete?: (commentId: string) => void;
  onToggleReply?: (commentId: string) => void;
  onReplyDraftChange?: (value: string) => void;
  onReply?: (commentId: string) => void;
  onCancelReply?: () => void;
}

export function ProfileCommentThread({
  comment,
  profileMemberId,
  profileOwner,
  viewerMemberId,
  showModeration = false,
  showAdminActions = false,
  replyingId = null,
  replyDraft = "",
  replyPosting = false,
  actionId = null,
  onHide,
  onDelete,
  onToggleReply,
  onReplyDraftChange,
  onReply,
  onCancelReply,
}: ProfileCommentThreadProps) {
  const replyCount = comment.replies.length;
  const isReplying = replyingId === comment.id;
  const isLoading = actionId === comment.id;
  const viewerIsOwner = Boolean(viewerMemberId && viewerMemberId === profileMemberId);
  const viewerIsAuthor = Boolean(viewerMemberId && viewerMemberId === comment.author.memberId);
  const canReply = Boolean(
    viewerMemberId && (viewerIsOwner || viewerIsAuthor) && !showAdminActions,
  );
  const [expanded, setExpanded] = useState(false);
  const [hasViewedReplies, setHasViewedReplies] = useState(false);
  const prevReplyCount = useRef(replyCount);

  useEffect(() => {
    if (isReplying) {
      setHasViewedReplies(true);
      setExpanded(true);
    }
  }, [isReplying]);

  useEffect(() => {
    if (replyCount > prevReplyCount.current) {
      setHasViewedReplies(true);
      setExpanded(true);
    }
    prevReplyCount.current = replyCount;
  }, [replyCount]);

  const replyPlaceholder = viewerIsOwner
    ? `Reply as ${profileOwner?.displayName ?? "profile owner"}…`
    : "Write a reply…";

  const showMoreOnRoot = showModeration || showAdminActions;
  const showHideOnRoot = showModeration;
  const showReplyOnRoot = canReply && (replyCount === 0 || hasViewedReplies);

  function handleExpandMore(open: boolean) {
    setExpanded(open);
    if (open) setHasViewedReplies(true);
  }

  function handleReplyClick() {
    onToggleReply?.(comment.id);
  }

  const moderationHandlers = {
    onHide: showModeration ? () => onHide?.(comment.id, !comment.isHidden) : undefined,
    onDelete: showModeration || showAdminActions ? () => onDelete?.(comment.id) : undefined,
  };

  return (
    <li
      className={cn(
        "relative overflow-hidden border border-white/8",
        comment.isHidden ? "bg-white/[0.01] opacity-80" : "bg-white/[0.02]",
      )}
    >
      <CornerAccents />

      <article className="p-4 sm:p-5">
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <MemberNameStack
                  displayName={comment.author.displayName}
                  discordUsername={comment.author.discordUsername}
                  profileSlug={comment.author.slug}
                  size="sm"
                  className="min-w-0"
                />
                <time
                  className="mt-1 block font-tech text-label-readable uppercase text-muted-foreground/60"
                  dateTime={comment.createdAt}
                  title={formatCommentDate(comment.createdAt)}
                >
                  {relativeTime(comment.createdAt)}
                </time>
              </div>
              <ThreadActionButtons
                showReply={showReplyOnRoot}
                isReplying={isReplying}
                showMore={showMoreOnRoot}
                showHide={showHideOnRoot}
                isHidden={comment.isHidden}
                loading={isLoading}
                onReplyClick={handleReplyClick}
                onHide={moderationHandlers.onHide}
                onDelete={moderationHandlers.onDelete}
              />
            </div>

            {comment.isHidden && (showModeration || showAdminActions) && (
              <span className="mt-2 inline-flex items-center gap-1 border border-amber-400/20 bg-amber-400/5 px-2 py-0.5 font-tech text-label-readable uppercase text-amber-400">
                <EyeOff className="h-2.5 w-2.5" />
                Hidden from public
              </span>
            )}

            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {comment.body}
            </p>
          </div>
        </div>
      </article>

      {replyCount > 0 && (
        <section className="border-t border-white/8 bg-white/[0.015] px-4 py-3 sm:px-5">
          <Collapsible open={expanded} onOpenChange={handleExpandMore}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="cursor-pointer inline-flex items-center gap-2 font-tech text-label-readable uppercase text-muted-foreground transition hover:text-foreground"
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
                />
                <MessageSquare className="h-3 w-3" strokeWidth={1.5} />
                Thread · {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4 border-t border-white/8 pt-4">
              {comment.replies.map((reply) => (
                <ThreadReplyMessage
                  key={reply.id}
                  reply={reply}
                  showReply={false}
                  isReplying={isReplying}
                  showMore={showMoreOnRoot}
                  showHide={false}
                  isThreadHidden={comment.isHidden}
                  loading={isLoading}
                  onReplyClick={handleReplyClick}
                  onDelete={moderationHandlers.onDelete}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </section>
      )}

      {canReply && isReplying && (
        <div className="border-t border-white/6 px-4 py-4 sm:px-5">
          <ReplyComposer
            draft={replyDraft}
            posting={replyPosting}
            placeholder={replyPlaceholder}
            onDraftChange={(value) => onReplyDraftChange?.(value)}
            onCancel={() => onCancelReply?.()}
            onSubmit={() => onReply?.(comment.id)}
          />
        </div>
      )}
    </li>
  );
}
