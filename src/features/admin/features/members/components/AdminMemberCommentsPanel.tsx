import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type { ProfileComment } from "@/features/member/types/profile-comments";

const PAGE_SIZE = 10;

function clampPage(page: number, totalPages: number): number {
  return Math.max(1, Math.min(page, Math.max(1, totalPages)));
}

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

interface AdminMemberCommentsPanelProps {
  profileMemberId: string;
  profileOwner: ProfileOwnerInfo;
}

export function AdminMemberCommentsPanel({
  profileMemberId,
  profileOwner,
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
    [profileMemberId],
  );

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  async function handleDelete(commentId: string) {
    setActionId(commentId);
    setError(null);
    try {
      await deleteProfileCommentAsAdmin({ profileMemberId, commentId });
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
                        className="h-8 rounded-none font-tech text-[10px] uppercase tracking-wider-2"
                        disabled={page <= 1}
                        onClick={() => setPage(clampPage(page - 1, totalPages))}
                      >
                        Previous
                      </Button>
                    </PaginationItem>

                    {pageNumbers(page, totalPages).map((p, index) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <Button
                            type="button"
                            variant={p === page ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8 font-tech text-xs"
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
                        className="h-8 rounded-none font-tech text-[10px] uppercase tracking-wider-2"
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

        <AlertDialog
          open={deleteTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetId(null);
          }}
        >
          <AlertDialogContent className="border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl tracking-display">
                Delete comment?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                This permanently removes the comment thread from this member&apos;s profile.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 text-white hover:bg-red-500/90"
                onClick={() => {
                  if (deleteTargetId) void handleDelete(deleteTargetId);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TechPanel>
  );
}
