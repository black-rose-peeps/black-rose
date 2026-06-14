import { useEffect, useRef, useState } from "react";
import { Check, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { inviteMemberToTeam } from "@/features/admin/features/teams/services/teams.service";
import {
  searchVerifiedMembersForInvite,
  type InviteSearchMember,
} from "@/features/admin/features/members/services/members.service";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { cn } from "@/lib/utils";
import { MAX_TEAM_SIZE } from "../constants";
import { InviteMemberSearchSkeleton } from "./InviteMemberSearchSkeleton";
import type { Team } from "../types";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  onInvited: (team: Team) => void;
}

const PAGE_SIZE = 8;

export function InviteMemberDialog({
  open,
  onOpenChange,
  team,
  onInvited,
}: InviteMemberDialogProps) {
  const teamRef = useRef(team);
  teamRef.current = team;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<InviteSearchMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [recentlyInvitedIds, setRecentlyInvitedIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const rosterCount = team.members.filter((m) => m.status !== "removed").length;
  const slotsLeft = MAX_TEAM_SIZE - rosterCount;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const showInitialSkeleton = searching && results.length === 0;

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPage(1);
      setError(null);
      setRecentlyInvitedIds(new Set());
      setResults([]);
      setTotal(0);
    }
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      const currentTeam = teamRef.current;
      const excludeIds = currentTeam.members
        .filter((m) => m.status !== "removed")
        .map((m) => m.userId);

      searchVerifiedMembersForInvite(search, excludeIds, {
        page,
        pageSize: PAGE_SIZE,
        game: currentTeam.game,
        excludeTeamId: currentTeam.id,
      })
        .then((result) => {
          if (!cancelled) {
            setResults(result.members);
            setTotal(result.total);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setTotal(0);
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search, page, team.id, team.game]);

  function isMemberInvited(memberId: string): boolean {
    if (recentlyInvitedIds.has(memberId)) return true;
    return team.members.some((m) => m.userId === memberId && m.status === "invited");
  }

  async function handleInvite(memberId: string) {
    if (invitingId !== null || isMemberInvited(memberId) || slotsLeft <= 0) return;
    setError(null);
    setInvitingId(memberId);
    try {
      const updated = await inviteMemberToTeam({ teamId: team.id, memberId });
      setRecentlyInvitedIds((prev) => new Set(prev).add(memberId));
      onInvited(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member.");
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 rounded-none border-white/12 bg-[oklch(0.08_0_0)] p-0 custom-scrollbar">
        <DialogHeader className="border-b border-white/8 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 font-display text-2xl tracking-display">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                Invite Member
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                Search verified {team.game} players. Invites stay pending until accepted.
              </DialogDescription>
            </div>
            <span
              className={cn(
                "shrink-0 border px-2.5 py-1 font-tech text-label-readable uppercase",
                slotsLeft > 0
                  ? "border-white/12 bg-white/5 text-muted-foreground"
                  : "border-red-400/25 bg-red-400/5 text-red-400",
              )}
            >
              {slotsLeft} slot{slotsLeft === 1 ? "" : "s"} left
            </span>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by discord username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-none border-white/12 bg-white/3 pl-9"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {showInitialSkeleton ? (
            <InviteMemberSearchSkeleton />
          ) : results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No eligible members match your search."
                  : "No verified members available to invite for this game."}
              </p>
            </div>
          ) : (
            <>
              <ul
                className={cn(
                  "max-h-72 divide-y divide-white/6 overflow-y-auto transition-opacity",
                  searching && "pointer-events-none opacity-50",
                )}
              >
                {results.map((member) => {
                  const invited = isMemberInvited(member.id);
                  const sending = invitingId === member.id;

                  return (
                    <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <MemberAvatar
                          avatarUrl={member.avatarUrl}
                          initials={member.avatarInitials}
                          name={member.displayName}
                          className="h-9 w-9 shrink-0 text-xs"
                        />
                        <MemberNameStack
                          displayName={member.displayName}
                          discordUsername={member.discordUsername}
                          size="sm"
                          className="min-w-0"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={invitingId !== null || invited || slotsLeft <= 0}
                        variant={invited ? "outline" : "secondary"}
                        onClick={() => void handleInvite(member.id)}
                        className={cn(
                          "min-w-[5.5rem] shrink-0 cursor-pointer rounded-none font-tech text-ui-readable uppercase",
                          invited &&
                            "border-emerald-400/25 bg-emerald-400/5 text-emerald-400 hover:bg-emerald-400/5",
                        )}
                      >
                        {invited ? (
                          <>
                            <Check className="h-3 w-3" />
                            Invited
                          </>
                        ) : sending ? (
                          "Sending…"
                        ) : (
                          "Invite"
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <AdminTablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onPageChange={setPage}
                className="border-white/6 px-0"
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
