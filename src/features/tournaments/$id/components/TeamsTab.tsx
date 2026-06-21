import { useMemo, useState } from "react";
import { Crown, Hash, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalDescription,
  AdaptiveModalFooter,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { sortTournamentTeamsBySeed, tournamentTeamsHaveSeeds } from "../../utils";
import type { TournamentTeam } from "../../types";

// ── Page size ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ── Pagination helpers (mirrors usePagination logic inline) ───────────────

function clamp(n: number, max: number) {
  return Math.max(1, Math.min(n, Math.max(1, max)));
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

// ── Props ──────────────────────────────────────────────────────────────────

interface TeamsTabProps {
  teams: TournamentTeam[];
  isLoading?: boolean;
}

// ── Root component ─────────────────────────────────────────────────────────

export function TeamsTab({ teams, isLoading = false }: TeamsTabProps) {
  const [page, setPageState] = useState(1);
  const [selected, setSelected] = useState<TournamentTeam | null>(null);
  const sortedTeams = useMemo(() => sortTournamentTeamsBySeed(teams), [teams]);
  const showSeeds = tournamentTeamsHaveSeeds(sortedTeams);

  const totalPages = Math.max(1, Math.ceil(sortedTeams.length / PAGE_SIZE));
  const safePage = clamp(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paged = sortedTeams.slice(start, start + PAGE_SIZE);
  const rangeStart = sortedTeams.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sortedTeams.length);

  function setPage(next: number) {
    setPageState(clamp(next, totalPages));
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="divide-y divide-border md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Team", "Captain", "Players", ...(showSeeds ? ["Seed"] : []), ""].map((h) => (
                  <TableHead
                    key={h || "actions"}
                    className="font-tech text-label-readable uppercase"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  {showSeeds && (
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="ml-auto h-7 w-14" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (sortedTeams.length === 0) {
    return (
      <ArenaEmptyState
        compact
        eyebrow="Roster Pending"
        title={
          <>
            No teams <span className="text-stroke">registered.</span>
          </>
        }
        description="Check back once registrations are approved and rosters are finalized."
      />
    );
  }

  // ── Table ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        {/* Mobile — card list */}
        <div className="divide-y divide-border md:hidden">
          {paged.map((team) => (
            <TeamMobileCard
              key={team.id}
              team={team}
              showSeed={showSeeds}
              onOpen={() => setSelected(team)}
            />
          ))}
        </div>

        {/* Desktop — table */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-tech text-label-readable uppercase">Team</TableHead>
                <TableHead className="font-tech text-label-readable uppercase">Captain</TableHead>
                <TableHead className="font-tech text-label-readable uppercase">Players</TableHead>
                {showSeeds && (
                  <TableHead className="font-tech text-label-readable uppercase">Seed</TableHead>
                )}
                <TableHead className="text-right font-tech text-label-readable uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((team) => (
                <TableRow
                  key={team.id}
                  className="cursor-pointer transition-colors hover:bg-secondary/40"
                  onClick={() => setSelected(team)}
                >
                  <TableCell>
                    <TeamIdentity team={team} />
                  </TableCell>
                  <TableCell className="text-sm">{team.captain}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {team.players.length} players
                  </TableCell>
                  {showSeeds && (
                    <TableCell className="text-sm text-muted-foreground">
                      {team.seed != null ? `#${team.seed}` : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-tech text-ui-readable uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(team);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {sortedTeams.length}
          </p>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 font-tech text-ui-readable uppercase"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                  >
                    Previous
                  </Button>
                </PaginationItem>

                {pageNumbers(safePage, totalPages).map((p, idx) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`e-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <Button
                        type="button"
                        variant={p === safePage ? "default" : "ghost"}
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
                    className="h-11 font-tech text-ui-readable uppercase"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* Team detail modal */}
      {selected && <TeamDetailModal team={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function TeamIdentity({ team }: { team: TournamentTeam }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center border border-border bg-secondary font-tech text-label-readable tracking-wider-2">
        {team.tag}
      </div>
      <div className="min-w-0">
        <div className="truncate font-display text-base tracking-wider">{team.name}</div>
        <div className="font-tech text-label-readable uppercase text-muted-foreground">
          {team.tag}
        </div>
      </div>
    </div>
  );
}

function TeamMobileCard({
  team,
  showSeed,
  onOpen,
}: {
  team: TournamentTeam;
  showSeed: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <TeamIdentity team={team} />
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 font-tech text-ui-readable uppercase"
          onClick={onOpen}
        >
          View
        </Button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="min-w-0">
          <dt className="font-tech uppercase text-muted-foreground">Captain</dt>
          <dd className="mt-0.5 truncate text-sm">{team.captain}</dd>
        </div>
        <div>
          <dt className="font-tech uppercase text-muted-foreground">Players</dt>
          <dd className="mt-0.5 text-sm">{team.players.length}</dd>
        </div>
        {showSeed && team.seed != null && (
          <div>
            <dt className="font-tech uppercase text-muted-foreground">Seed</dt>
            <dd className="mt-0.5 text-sm">#{team.seed}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// ── Team detail modal ──────────────────────────────────────────────────────

function TeamDetailModal({ team, onClose }: { team: TournamentTeam; onClose: () => void }) {
  return (
    <AdaptiveModal open onOpenChange={(next) => !next && onClose()}>
      <AdaptiveModalContent
        mobileSize="full"
        className="flex max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <AdaptiveModalHeader>
          <div className="flex items-start gap-4 pr-6">
            <div className="grid h-12 w-12 shrink-0 place-items-center border border-border bg-secondary font-tech text-sm tracking-wider">
              {team.tag}
            </div>
            <div className="min-w-0 space-y-1">
              <AdaptiveModalTitle className="text-xl tracking-wider-2">
                {team.name}
              </AdaptiveModalTitle>
              <AdaptiveModalDescription>Team roster and details</AdaptiveModalDescription>
            </div>
          </div>
        </AdaptiveModalHeader>

        <AdaptiveModalBody className="custom-scrollbar space-y-4">
          <div className="rounded-lg border border-border bg-muted/10 p-4">
            <h3 className="mb-3 font-tech text-label-readable uppercase text-muted-foreground">
              Team Info
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <dt className="text-muted-foreground">Tag</dt>
                <dd className="ml-auto font-medium">{team.tag}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <dt className="text-muted-foreground">Captain</dt>
                <dd className="ml-auto font-medium">{team.captain}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <dt className="text-muted-foreground">Roster</dt>
                <dd className="ml-auto font-medium">{team.players.length} players</dd>
              </div>
              {team.seed != null && (
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-center font-tech text-label-readable text-muted-foreground">
                    #
                  </span>
                  <dt className="text-muted-foreground">Seed</dt>
                  <dd className="ml-auto font-medium">{team.seed}</dd>
                </div>
              )}
            </dl>
            <div className="mt-3">
              <Badge variant="secondary" className="font-tech text-label-readable uppercase">
                Registered
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Roster table */}
          <div className="space-y-3 overflow-x-auto">
            <h3 className="font-tech text-label-readable uppercase text-muted-foreground">
              Roster
            </h3>
            <Table className="min-w-[20rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-tech text-label-readable uppercase">#</TableHead>
                  <TableHead className="font-tech text-label-readable uppercase">IGN</TableHead>
                  <TableHead className="font-tech text-label-readable uppercase">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.players.map((p, i) => (
                  <TableRow key={`${p.ign}-${i}`}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      {p.discord ? (
                        <MemberNameStack
                          displayName={p.ign}
                          discordUsername={p.discord}
                          profileSlug={p.profileSlug}
                          size="sm"
                        />
                      ) : (
                        <span className="font-medium">{p.ign}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-tech text-label-readable uppercase">
                        {p.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AdaptiveModalBody>

        <AdaptiveModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="min-h-11 font-tech uppercase tracking-wider"
          >
            Close
          </Button>
        </AdaptiveModalFooter>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
