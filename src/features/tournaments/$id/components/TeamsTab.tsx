import { useState } from "react";
import { Crown, Hash, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const totalPages = Math.max(1, Math.ceil(teams.length / PAGE_SIZE));
  const safePage = clamp(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paged = teams.slice(start, start + PAGE_SIZE);
  const rangeStart = teams.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, teams.length);

  function setPage(next: number) {
    setPageState(clamp(next, totalPages));
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Team", "Captain", "Players", "Seed", ""].map((h) => (
                <TableHead key={h} className="text-[10px] font-tech uppercase tracking-wider-2">
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
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-7 w-14 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (teams.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Team
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Captain
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Players
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Seed
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                No teams registered yet. Check back once registrations are approved.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Table ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Team
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Captain
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Players
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Seed
              </TableHead>
              <TableHead className="text-right text-[10px] font-tech uppercase tracking-wider-2">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((team, i) => (
              <TableRow
                key={team.id}
                className="cursor-pointer transition-colors hover:bg-secondary/40"
                onClick={() => setSelected(team)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center border border-border bg-secondary text-[10px] font-tech tracking-wider-2">
                      {team.tag}
                    </div>
                    <div>
                      <div className="font-display text-base tracking-wider">{team.name}</div>
                      <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                        {team.tag}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{team.captain}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {team.players.length} players
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  #{team.seed ?? start + i + 1}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-tech text-[10px] uppercase tracking-wider"
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

        {/* Pagination footer */}
        <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {teams.length}
          </p>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 font-tech text-[10px] uppercase tracking-wider"
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
                    className="h-8 font-tech text-[10px] uppercase tracking-wider"
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

// ── Team detail modal ──────────────────────────────────────────────────────

function TeamDetailModal({ team, onClose }: { team: TournamentTeam; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="custom-scrollbar max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-4 pr-6">
            <div className="grid h-12 w-12 shrink-0 place-items-center border border-border bg-secondary font-tech text-sm tracking-wider">
              {team.tag}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="font-display text-xl tracking-wider-2">
                {team.name}
              </DialogTitle>
              <DialogDescription>Team roster and details</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Info card */}
        <div className="rounded-lg border border-border bg-muted/10 p-4">
          <h3 className="mb-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
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
            {team.seed !== undefined && (
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 shrink-0 text-center text-[10px] font-tech text-muted-foreground">
                  #
                </span>
                <dt className="text-muted-foreground">Seed</dt>
                <dd className="ml-auto font-medium">{team.seed}</dd>
              </div>
            )}
          </dl>
          <div className="mt-3">
            <Badge variant="secondary" className="font-tech text-[10px] uppercase">
              Registered
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Roster table */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Roster
          </h3>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  #
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  IGN
                </TableHead>
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Role
                </TableHead>
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
                        size="sm"
                      />
                    ) : (
                      <span className="font-medium">{p.ign}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-tech text-[10px] uppercase">
                      {p.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="font-tech uppercase tracking-wider"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
