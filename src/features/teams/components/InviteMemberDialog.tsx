import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { inviteMemberToTeam } from "@/features/admin/features/teams/services/teams.service";
import {
  searchVerifiedMembersForInvite,
  type InviteSearchMember,
} from "@/features/admin/features/members/services/members.service";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { cn } from "@/lib/utils";
import { isValorantGame } from "@/features/member/utils/valorant-identity";
import { MAX_TEAM_SIZE } from "../constants";
import type { Team } from "../types";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  onInvited: (team: Team) => void;
}

const PAGE_SIZE = 8;

function clearSearchButton(onClick: () => void) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="clip-cta inline-flex h-9 items-center border border-white/15 bg-white/4 px-4 font-tech text-ui-readable uppercase transition hover:border-white/25 hover:bg-white/8"
    >
      Clear search
    </button>
  );
}

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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [recentlyInvitedIds, setRecentlyInvitedIds] = useState<Set<string>>(() => new Set());
  const [inviteError, setInviteError] = useState<string | null>(null);

  const rosterCount = team.members.filter((m) => m.status !== "removed").length;
  const rosterExcludeKey = team.members
    .filter((m) => m.status !== "removed")
    .map((m) => m.userId)
    .sort()
    .join(",");
  const slotsLeft = MAX_TEAM_SIZE - rosterCount;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasQuery = search.trim().length > 0;
  const isValorantTeam = isValorantGame(team.game);
  const showInitialSkeleton = searching && results.length === 0 && hasQuery;
  const searchPlaceholder = isValorantTeam
    ? "Discord username, display name, or Valorant IGN…"
    : "Discord username or display name…";
  const idleDescription = isValorantTeam
    ? "Search verified members by Discord handle, display name, or Valorant IGN (e.g. PlayerName#TAG)."
    : "Search verified members by Discord handle or display name.";

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPage(1);
      setSearchError(null);
      setInviteError(null);
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
    const timer = window.setTimeout(() => {
      const query = search.trim();
      if (!query) {
        setResults([]);
        setTotal(0);
        setSearchError(null);
        setSearching(false);
        return;
      }

      setSearching(true);
      setSearchError(null);
      const currentTeam = teamRef.current;
      const excludeIds = currentTeam.members
        .filter((m) => m.status !== "removed")
        .map((m) => m.userId);

      searchVerifiedMembersForInvite(query, excludeIds, {
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
        .catch((err) => {
          if (!cancelled) {
            setResults([]);
            setTotal(0);
            setSearchError(err instanceof Error ? err.message : "Search failed.");
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, search, page, team.id, team.game, rosterExcludeKey]);

  function isMemberInvited(memberId: string): boolean {
    if (recentlyInvitedIds.has(memberId)) return true;
    return team.members.some((m) => m.userId === memberId && m.status === "invited");
  }

  async function handleInvite(memberId: string) {
    if (invitingId !== null || isMemberInvited(memberId) || slotsLeft <= 0) return;
    setInviteError(null);
    setInvitingId(memberId);
    try {
      const updated = await inviteMemberToTeam({ teamId: team.id, memberId });
      setRecentlyInvitedIds((prev) => new Set(prev).add(memberId));
      onInvited(updated);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member.");
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden rounded-none border-white/12 bg-[oklch(0.08_0_0)] p-0 shadow-2xl shadow-black/40">
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-tech text-label-readable uppercase text-muted-foreground">
                Team Roster
              </p>
              <p className="mt-0.5 flex items-center gap-2 font-display text-xl tracking-display text-foreground">
                <UserPlus className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  Invite to {team.name}
                  <span className="text-muted-foreground"> [{team.tag}]</span>
                </span>
              </p>
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
        </div>

        <Command
          shouldFilter={false}
          className="rounded-none bg-transparent [&_[cmdk-input-wrapper]]:border-white/8 [&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]_svg]:text-muted-foreground"
        >
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            disabled={slotsLeft <= 0}
            className="h-12 font-tech text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
          />

          <CommandList className="custom-scrollbar max-h-80">
            {slotsLeft <= 0 ? (
              <div className="px-4 py-3">
                <ArenaEmptyState
                  embedded
                  eyebrow="Roster Full"
                  title={
                    <>
                      No open <span className="text-stroke">slots.</span>
                    </>
                  }
                  description="Your roster is full. Remove a member or wait for a pending invite to expire before inviting someone new."
                  className="border-red-400/15 bg-red-400/[0.03]"
                />
              </div>
            ) : !hasQuery ? (
              <div className="px-4 py-3">
                <ArenaEmptyState
                  embedded
                  eyebrow="Verified Roster"
                  title={
                    <>
                      Find a <span className="text-stroke">teammate.</span>
                    </>
                  }
                  description={idleDescription}
                  className="border-white/6 bg-transparent"
                />
              </div>
            ) : showInitialSkeleton ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : searchError ? (
              <div className="px-4 py-3">
                <ArenaEmptyState
                  embedded
                  eyebrow="Search Error"
                  title={
                    <>
                      Couldn&apos;t complete <span className="text-stroke">search.</span>
                    </>
                  }
                  description={searchError}
                  actions={clearSearchButton(() => setSearch(""))}
                  className="border-red-400/15 bg-red-400/[0.03]"
                />
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3">
                <ArenaEmptyState
                  embedded
                  eyebrow="No Matches"
                  title={
                    <>
                      Nobody <span className="text-stroke">eligible.</span>
                    </>
                  }
                  description={`No verified member matches "${search.trim()}". They may already be on a ${team.game} roster, on your team, or not verified yet.`}
                  actions={clearSearchButton(() => setSearch(""))}
                  className="border-white/6 bg-transparent"
                />
              </div>
            ) : (
              <CommandGroup
                heading={
                  searching
                    ? "Searching…"
                    : `${total} member${total === 1 ? "" : "s"} found`
                }
                className="px-2 pb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-tech [&_[cmdk-group-heading]]:text-label-readable [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-muted-foreground/70"
              >
                {results.map((member) => {
                  const invited = isMemberInvited(member.id);
                  const sending = invitingId === member.id;

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-white/4",
                        searching && "pointer-events-none opacity-60",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <MemberAvatar
                          avatarUrl={member.avatarUrl}
                          initials={member.avatarInitials}
                          name={member.displayName}
                          className="h-9 w-9 shrink-0 text-xs"
                        />
                        <MemberNameStack
                          displayName={member.displayName}
                          discordUsername={member.discordUsername}
                          profileSlug={member.profileSlug}
                          size="sm"
                          className="min-w-0"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={invitingId !== null || invited}
                        variant={invited ? "outline" : "secondary"}
                        onClick={() => void handleInvite(member.id)}
                        className={cn(
                          "min-w-22 shrink-0 cursor-pointer rounded-none font-tech text-ui-readable uppercase",
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
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          "Invite"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        <div className="flex items-center justify-between border-t border-white/8 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {hasQuery && total > PAGE_SIZE ? (
              <>
                <button
                  type="button"
                  disabled={page <= 1 || searching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 font-tech uppercase tracking-wider transition hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || searching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 font-tech uppercase tracking-wider transition hover:text-foreground disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-tech uppercase tracking-wider">
                <Search className="h-3 w-3" />
                Verified · {team.game} eligible only
              </span>
            )}
          </div>
          <span className="hidden font-tech uppercase tracking-wider sm:inline">Esc close</span>
        </div>

        {inviteError && (
          <div className="border-t border-red-400/15 bg-red-400/[0.03] px-4 py-3">
            <p className="text-sm text-red-400">{inviteError}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
