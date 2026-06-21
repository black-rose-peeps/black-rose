import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Crown,
  Hash,
  ShieldAlert,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchTeamById } from "@/features/admin/features/teams/services/teams.service";
import {
  fetchRegistrationTournamentHistory,
  type RegistrationHistoryEntry,
} from "@/features/admin/features/tournaments/services/tournament-registrations.service";
import { registrationStatusVariant } from "@/features/admin/features/participants/utils";
import {
  isReviewQueueStatus,
  registrationActionsEnabled,
} from "@/features/admin/features/participants/constants/registration-status";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import {
  TeamRosterTableSkeleton,
  TournamentHistoryListSkeleton,
} from "@/features/admin/components/TeamRosterTableSkeleton";
import { isValorantGame } from "@/features/member/utils/valorant-identity";
import { cn } from "@/lib/utils";
import type { Team, TeamMember } from "@/features/teams/types";
import type { MockTeam, TournamentStatus } from "@/lib/mock-data";

interface TeamModalProps {
  team: MockTeam;
  tournamentName?: string;
  tournamentStatus?: TournamentStatus | null;
  onClose: () => void;
  onApprove?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
  isUpdating?: boolean;
}

function formatDiscord(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

type RegistrationDecisionMode = "review" | "approved" | "rejected" | null;

function resolveRegistrationDecisionMode(
  status: MockTeam["status"],
  actionsEnabled: boolean,
  hasHandlers: boolean,
): RegistrationDecisionMode {
  if (!actionsEnabled || !hasHandlers) return null;
  if (isReviewQueueStatus(status)) return "review";
  if (status === "Approved") return "approved";
  if (status === "Rejected") return "rejected";
  return null;
}

export function TeamModal({
  team,
  tournamentName,
  tournamentStatus = null,
  onClose,
  onApprove,
  onReject,
  isUpdating = false,
}: TeamModalProps) {
  const [liveMembers, setLiveMembers] = useState<TeamMember[] | null>(null);
  const [rosterGame, setRosterGame] = useState<Team["game"] | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [tournamentHistory, setTournamentHistory] = useState<RegistrationHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);

    fetchRegistrationTournamentHistory(team.id, team.rosterTeamId, team.memberUserId)
      .then((entries) => {
        if (!cancelled) setTournamentHistory(entries);
      })
      .catch(() => {
        if (!cancelled) setTournamentHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [team.id, team.rosterTeamId, team.memberUserId]);

  useEffect(() => {
    if (!team.rosterTeamId) {
      setLiveMembers(null);
      setRosterGame(null);
      setRosterLoading(false);
      return;
    }

    let cancelled = false;
    setRosterLoading(true);

    fetchTeamById(team.rosterTeamId)
      .then((rosterTeam) => {
        if (cancelled || !rosterTeam) return;
        setRosterGame(rosterTeam.game);
        setLiveMembers(
          rosterTeam.members.filter((m) => m.status === "captain" || m.status === "active"),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setLiveMembers(null);
          setRosterGame(null);
        }
      })
      .finally(() => {
        if (!cancelled) setRosterLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [team.rosterTeamId]);

  const actionsEnabled = registrationActionsEnabled(tournamentStatus);
  const hasHandlers = Boolean(onApprove || onReject);
  const decisionMode = resolveRegistrationDecisionMode(team.status, actionsEnabled, hasHandlers);

  const activeRoster = liveMembers && liveMembers.length > 0 ? liveMembers : null;
  const isLive = activeRoster !== null;
  const rosterCount = isLive ? activeRoster.length : team.members.length;
  const showIgnColumn = !rosterGame || !isValorantGame(rosterGame);

  const tournamentLabel = tournamentName ?? "this tournament";

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
              <DialogDescription>
                {tournamentName
                  ? `Registration for ${tournamentName}`
                  : "Registered team details and roster"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
            <h3 className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Team Info
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <dt className="text-muted-foreground">Tag</dt>
                <dd className="ml-auto font-medium">{team.tag}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 text-muted-foreground" />
                <dt className="text-muted-foreground">Captain</dt>
                <dd className="ml-auto font-medium">{team.captain}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <dt className="text-muted-foreground">Registered</dt>
                <dd className="ml-auto font-medium">{team.registrationDate}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <dt className="text-muted-foreground">Roster</dt>
                <dd className="ml-auto font-medium">{rosterCount} players</dd>
              </div>
            </dl>
            <Badge
              variant={registrationStatusVariant(team.status)}
              className="font-tech text-[10px] uppercase"
            >
              {team.status}
            </Badge>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <h3 className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Tournament History
            </h3>
            {historyLoading ? (
              <TournamentHistoryListSkeleton rows={3} />
            ) : tournamentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prior tournament entries.</p>
            ) : (
              <ul className="max-h-40 space-y-2 overflow-y-auto pr-1 text-sm">
                {tournamentHistory.map((entry) => (
                  <li
                    key={entry.registrationId}
                    className="flex items-start justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        to="/admin/tournaments/$id"
                        params={{ id: entry.tournamentId }}
                        className="font-medium text-foreground transition hover:text-foreground/80"
                      >
                        {entry.tournamentName}
                      </Link>
                      <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                        {entry.registrationDate}
                        {entry.tournamentStatus ? ` · ${entry.tournamentStatus}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant={registrationStatusVariant(entry.status)}
                      className="shrink-0 font-tech text-[9px] uppercase"
                    >
                      {entry.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Participating Roster
            </h3>
            {team.rosterTeamId && (
              <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/70">
                {rosterLoading
                  ? "Loading live roster…"
                  : isLive
                    ? "Live team roster"
                    : "Registration snapshot"}
              </span>
            )}
          </div>

          {rosterLoading ? (
            <TeamRosterTableSkeleton
              rows={Math.max(team.members.length, 3)}
              variant="live"
              showIgnColumn={showIgnColumn}
            />
          ) : isLive ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                    Player
                  </TableHead>
                  {showIgnColumn && (
                    <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                      IGN
                    </TableHead>
                  )}
                  <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                    Role
                  </TableHead>
                  <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRoster.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <MemberNameStack
                        displayName={member.displayName}
                        discordUsername={member.discordUsername}
                        profileSlug={member.profileSlug}
                        size="sm"
                      />
                    </TableCell>
                    {showIgnColumn && (
                      <TableCell className="text-muted-foreground">{member.ign || "—"}</TableCell>
                    )}
                    <TableCell className="text-muted-foreground">{member.role || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-tech text-[10px] uppercase">
                        {member.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : team.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                    IGN
                  </TableHead>
                  <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                    Role
                  </TableHead>
                  <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                    Discord
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member, index) => (
                  <TableRow key={`${member.ign}-${member.role}-${index}`}>
                    <TableCell className="font-medium">{member.ign}</TableCell>
                    <TableCell className="text-muted-foreground">{member.role || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDiscord(member.discord)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No roster players on this registration.
            </p>
          )}
        </div>

        {decisionMode && (
          <section
            className={cn(
              "relative overflow-hidden border",
              decisionMode === "review" && "border-amber-400/25 bg-amber-400/4",
              decisionMode === "approved" && "border-emerald-400/25 bg-emerald-400/4",
              decisionMode === "rejected" && "border-destructive/25 bg-destructive/5",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 w-px bg-linear-to-b to-transparent",
                decisionMode === "review" && "from-amber-300/70",
                decisionMode === "approved" && "from-emerald-300/70",
                decisionMode === "rejected" && "from-destructive/60",
              )}
            />

            <div className="relative p-4 sm:p-5">
              {decisionMode === "review" && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center border border-amber-400/30 bg-amber-400/10">
                      <ShieldAlert className="h-4 w-4 text-amber-200" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-tech text-[10px] uppercase tracking-wider-2 text-amber-200/80">
                        Awaiting decision
                      </p>
                      <p className="mt-1 font-display text-base tracking-display text-white">
                        Review this entry before approving
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        Check the roster above. Approving reserves a slot in{" "}
                        <span className="text-foreground/90">{tournamentLabel}</span>.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={isUpdating || !onApprove}
                      onClick={() => setApproveConfirmOpen(true)}
                      className={cn(
                        "group relative overflow-hidden border border-emerald-400/30 bg-emerald-400/8 p-4 text-left transition",
                        "hover:border-emerald-400/50 hover:bg-emerald-400/12",
                        "disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      <CheckCircle2
                        className="mb-2 h-5 w-5 text-emerald-300"
                        strokeWidth={1.5}
                      />
                      <p className="font-display text-sm tracking-display text-white">
                        Approve entry
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Confirm roster and add to the tournament field.
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating || !onReject}
                      onClick={() => setRejectConfirmOpen(true)}
                      className={cn(
                        "group relative overflow-hidden border border-border bg-black/20 p-4 text-left transition",
                        "hover:border-destructive/40 hover:bg-destructive/5",
                        "disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      <XCircle className="mb-2 h-5 w-5 text-muted-foreground group-hover:text-destructive" strokeWidth={1.5} />
                      <p className="font-display text-sm tracking-display text-white">
                        Decline entry
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Reject this registration without using a slot.
                      </p>
                    </button>
                  </div>
                </>
              )}

              {decisionMode === "approved" && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center border border-emerald-400/30 bg-emerald-400/10">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-tech text-[10px] uppercase tracking-wider-2 text-emerald-200/80">
                        Approved
                      </p>
                      <p className="mt-1 font-display text-base tracking-display text-white">
                        Active tournament entry
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        This team counts toward the registration cap and can be seeded into the
                        bracket.
                      </p>
                    </div>
                  </div>

                  {onReject && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUpdating}
                      className="shrink-0 border-destructive/30 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRejectConfirmOpen(true)}
                    >
                      <UserX className="mr-1.5 h-3.5 w-3.5" />
                      Revoke approval
                    </Button>
                  )}
                </div>
              )}

              {decisionMode === "rejected" && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center border border-destructive/30 bg-destructive/10">
                      <XCircle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-tech text-[10px] uppercase tracking-wider-2 text-destructive/80">
                        Declined
                      </p>
                      <p className="mt-1 font-display text-base tracking-display text-white">
                        Not in the tournament field
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        You can approve this entry later if the decision was made in error.
                      </p>
                    </div>
                  </div>

                  {onApprove && (
                    <Button
                      type="button"
                      disabled={isUpdating}
                      className="shrink-0 bg-emerald-500 font-tech text-[10px] uppercase tracking-wider-2 text-white hover:bg-emerald-400"
                      onClick={() => setApproveConfirmOpen(true)}
                    >
                      Approve entry
                    </Button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

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

        <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
          <AlertDialogContent className="border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl tracking-display">
                Approve {team.name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                This confirms the entry for{" "}
                <span className="text-foreground">{tournamentLabel}</span>. The team will count
                toward the registration cap and can be seeded into the bracket.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-tech uppercase tracking-wider">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-emerald-500 font-tech uppercase tracking-wider text-white hover:bg-emerald-400"
                disabled={isUpdating}
                onClick={() => {
                  setApproveConfirmOpen(false);
                  void onApprove?.();
                }}
              >
                Approve entry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
          <AlertDialogContent className="border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl tracking-display">
                {decisionMode === "approved"
                  ? `Revoke approval for ${team.name}?`
                  : `Decline ${team.name}?`}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {decisionMode === "approved" ? (
                  <>
                    This removes the team from the approved field for{" "}
                    <span className="text-foreground">{tournamentLabel}</span>, frees a
                    registration slot, and clears their active tournament link. If the bracket was
                    already generated, update seeding separately.
                  </>
                ) : (
                  <>
                    This declines the registration for{" "}
                    <span className="text-foreground">{tournamentLabel}</span> without using a
                    tournament slot.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-tech uppercase tracking-wider">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive font-tech uppercase tracking-wider text-destructive-foreground hover:bg-destructive/90"
                disabled={isUpdating}
                onClick={() => {
                  setRejectConfirmOpen(false);
                  void onReject?.();
                }}
              >
                {decisionMode === "approved" ? "Revoke approval" : "Decline entry"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
