import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { TechPanel } from "@/features/admin/components/AdminShell";
import {
  ProfileCommentThread,
  type ProfileOwnerInfo,
} from "@/features/member/components/ProfileCommentThread";
import {
  deleteProfileCommentAsAdmin,
  fetchProfileCommentsAsAdmin,
} from "@/features/member/services/profile-comments.service";
import { ADMIN_AUDIT_ACTIONS, logAdminAction } from "@/features/admin/services/audit-log.service";
import type { ProfileComment } from "@/features/member/types/profile-comments";
import { clampPage, pageNumbers } from "@/lib/pagination";

const PAGE_SIZE = 10;

interface AdminMemberCommentsPanelProps {
  profileMemberId: string;
  profileOwner: ProfileOwnerInfo;
  onCommentsCountChange?: (count: number) => void;
}

export function AdminMemberCommentsPanel({
  profileMemberId,
  profileOwner,
  onCommentsCountChange,
}: AdminMemberCommentsPanelProps) {
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadPage = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProfileCommentsAsAdmin(profileMemberId, {
          page: pageToLoad,
          pageSize: PAGE_SIZE,
        });
        setComments(data.comments);
        setTotal(data.total);
        onCommentsCountChange?.(data.total);
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
    [onCommentsCountChange, profileMemberId],
  );

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  async function handleDelete(commentId: string) {
    setActionId(commentId);
    setError(null);
    const comment = comments.find((entry) => entry.id === commentId);
    try {
      await deleteProfileCommentAsAdmin({ profileMemberId, commentId });
      void logAdminAction({
        action: ADMIN_AUDIT_ACTIONS.PROFILE_COMMENT_DELETED,
        entityType: "profile_comment",
        entityId: commentId,
        metadata: {
          memberName: profileOwner.displayName,
          profileSlug: profileOwner.slug,
          bodyPreview: comment?.body.slice(0, 120),
        },
      });
      setDeleteTargetId(null);
      await loadPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment.");
    } finally {
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
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-none bg-white/5" />
            ))}
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">No profile comments yet.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {comments.map((comment) => (
                <ProfileCommentThread
                  key={comment.id}
                  comment={comment}
                  profileMemberId={profileMemberId}
                  profileOwner={profileOwner}
                  showAdminActions
                  actionId={actionId}
                  onDelete={(id) => setDeleteTargetId(id)}
                />
              ))}
            </ul>

            <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground">
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
                        className="min-h-11 rounded-none font-tech text-[10px] uppercase tracking-wider-2 sm:min-h-8"
                        disabled={page <= 1}
                        onClick={() => setPage(clampPage(page - 1, totalPages))}
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
                            className="h-11 w-11 font-tech text-xs sm:h-8 sm:w-8"
                            onClick={() => setPage(p)}
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
                        className="min-h-11 rounded-none font-tech text-[10px] uppercase tracking-wider-2 sm:min-h-8"
                        disabled={page >= totalPages}
                        onClick={() => setPage(clampPage(page + 1, totalPages))}
                      >
                        Next
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </>
        )}

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
                This permanently removes the comment thread from this member&apos;s profile.
              </AdaptiveAlertDialogDescription>
            </AdaptiveAlertDialogHeader>
            <AdaptiveAlertDialogFooter>
              <AdaptiveAlertDialogCancel>Cancel</AdaptiveAlertDialogCancel>
              <AdaptiveAlertDialogAction
                className="bg-red-500 text-white hover:bg-red-500/90"
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
