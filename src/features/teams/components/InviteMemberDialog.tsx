import { useEffect, useState } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<InviteSearchMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rosterCount = team.members.filter((m) => m.status !== "removed").length;
  const slotsLeft = MAX_TEAM_SIZE - rosterCount;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPage(1);
      setError(null);
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
      const excludeIds = team.members.filter((m) => m.status !== "removed").map((m) => m.userId);

      searchVerifiedMembersForInvite(search, excludeIds, {
        page,
        pageSize: PAGE_SIZE,
        game: team.game,
        excludeTeamId: team.id,
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
  }, [open, search, page, team]);

  async function handleInvite(memberId: string) {
    setError(null);
    setInvitingId(memberId);
    try {
      const updated = await inviteMemberToTeam({ teamId: team.id, memberId });
      onInvited(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member.");
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none border-white/12 bg-[oklch(0.08_0_0)] p-0 gap-0 custom-scrollbar">
        <DialogHeader className="border-b border-white/8 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl tracking-display">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            Invite Member
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Search verified members available for {team.game}. Members already on an active{" "}
            {team.game} roster are hidden.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search verified members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 border-white/12 bg-white/3 pl-9 rounded-none"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {searching ? (
            <InviteMemberSearchSkeleton />
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {search
                ? "No eligible members found."
                : "No verified members available to invite for this game."}
            </p>
          ) : (
            <>
              <ul className="max-h-64 divide-y divide-white/6 overflow-y-auto">
                {results.map((member) => {
                  const alreadyInvited = team.members.some(
                    (m) => m.userId === member.id && m.status === "invited",
                  );
                  return (
                    <li key={member.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center border border-white/10 bg-white/5 font-display text-xs tracking-display">
                          {member.avatarInitials}
                        </div>
                        <span className="text-sm font-medium">{member.displayName}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={alreadyInvited || invitingId === member.id || slotsLeft <= 0}
                        variant={alreadyInvited ? "outline" : "secondary"}
                        onClick={() => void handleInvite(member.id)}
                        className="rounded-none font-tech text-[10px] uppercase tracking-wider-2"
                      >
                        {invitingId === member.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : alreadyInvited ? (
                          "Invited"
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

          <p className="text-[10px] text-muted-foreground/50">
            {slotsLeft} roster slot{slotsLeft === 1 ? "" : "s"} remaining · invites appear as
            pending until accepted
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
