import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EyeOff, Loader2, MessageSquare, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { ProfileCard } from "@/features/member/components/ProfileCard";
import { PanelEmptyState } from "@/features/member/components/MemberShell";
import {
  createProfileComment,
  fetchProfileComments,
  replyToProfileComment,
  setProfileCommentHidden,
} from "@/features/member/services/profile-comments.service";
import type { ProfileComment } from "@/features/member/types/profile-comments";

const MAX_LENGTH = 500;

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

interface ProfileCommentsPanelProps {
  profileMemberId: string;
  isOwnProfile: boolean;
  viewerMemberId?: string;
  viewerIsVerified: boolean;
}

export function ProfileCommentsPanel({
  profileMemberId,
  isOwnProfile,
  viewerMemberId,
  viewerIsVerified,
}: ProfileCommentsPanelProps) {
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const canComment = viewerIsVerified && Boolean(viewerMemberId) && !isOwnProfile;

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
        prev.map((comment) =>
          comment.id === parentCommentId ? { ...comment, reply } : comment,
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

  return (
    <ProfileCard label="Profile Comments">
      <div className="flex flex-col gap-5">
        {canComment && (
          <div className="border border-white/8 bg-white/[0.02] p-4">
            <p className="mb-3 font-tech text-label-readable uppercase text-muted-foreground">
              Leave a comment
            </p>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="Say something about this member…"
              rows={3}
              className="min-h-[88px] resize-none rounded-none border-white/12 bg-white/[0.03] shadow-none focus-visible:ring-white/20"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-tech text-label-readable uppercase text-muted-foreground/60">
                {draft.length}/{MAX_LENGTH}
              </span>
              <Button
                type="button"
                size="sm"
                disabled={posting || !draft.trim()}
                onClick={() => void handlePost()}
                className="rounded-none font-tech text-ui-readable uppercase"
              >
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Post Comment
              </Button>
            </div>
          </div>
        )}

        {!viewerIsVerified && !isOwnProfile && (
          <p className="text-sm text-muted-foreground">
            Sign in as a verified member to leave a profile comment.
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <PanelEmptyState
            icon={<MessageSquare className="h-8 w-8" />}
            title="No comments yet"
            description={
              canComment
                ? "Be the first to leave a note on this profile."
                : isOwnProfile
                  ? "When other members comment, they will appear here."
                  : "This profile has no public comments yet."
            }
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className={`border border-white/8 p-4 ${
                  comment.isHidden ? "bg-white/[0.01] opacity-70" : "bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Link
                    to="/members/$slug"
                    params={{ slug: comment.author.slug }}
                    className="shrink-0"
                  >
                    <MemberAvatar
                      avatarUrl={comment.author.avatarUrl}
                      initials={comment.author.avatarInitials}
                      name={comment.author.displayName}
                      className="h-10 w-10 text-sm"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
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
                      <span className="shrink-0 font-tech text-label-readable uppercase text-muted-foreground/60">
                        {formatCommentDate(comment.createdAt)}
                      </span>
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

                    {comment.reply && (
                      <div className="mt-4 border-l-2 border-emerald-400/25 bg-emerald-400/5 px-4 py-3">
                        <p className="font-tech text-label-readable uppercase text-emerald-400/80">
                          Profile owner
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                          {comment.reply.body}
                        </p>
                        <p className="mt-2 font-tech text-label-readable uppercase text-muted-foreground/50">
                          {formatCommentDate(comment.reply.createdAt)}
                        </p>
                      </div>
                    )}

                    {isOwnProfile && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionId === comment.id}
                          onClick={() => void handleHide(comment.id, !comment.isHidden)}
                          className="rounded-none border-white/12 bg-white/5 font-tech text-ui-readable uppercase"
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
                            onClick={() => {
                              setReplyingId(replyingId === comment.id ? null : comment.id);
                              setReplyDraft("");
                            }}
                            className="rounded-none border-white/12 bg-white/5 font-tech text-ui-readable uppercase"
                          >
                            <Reply className="h-3 w-3" />
                            Reply
                          </Button>
                        )}
                      </div>
                    )}

                    {isOwnProfile && replyingId === comment.id && !comment.reply && (
                      <div className="mt-4 border border-white/8 bg-white/[0.02] p-3">
                        <Textarea
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value.slice(0, MAX_LENGTH))}
                          placeholder="Write your reply…"
                          rows={2}
                          className="min-h-[72px] resize-none rounded-none border-white/12 bg-white/[0.03] shadow-none focus-visible:ring-white/20"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setReplyingId(null)}
                            className="rounded-none font-tech text-ui-readable uppercase"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={replyPosting || !replyDraft.trim()}
                            onClick={() => void handleReply(comment.id)}
                            className="rounded-none font-tech text-ui-readable uppercase"
                          >
                            {replyPosting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            Post Reply
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProfileCard>
  );
}
