import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, UserX, XCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalFooter,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
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
import { TeamModalRosterMobileList } from "@/features/admin/components/mobile";
import { isValorantGame } from "@/features/member/utils/valorant-identity";
import { useIsMobile } from "@/hooks/use-mobile";
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

type PanelTab = "roster" | "history";

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

function TournamentHistoryList({ entries }: { entries: RegistrationHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No prior tournament entries.</p>;
  }

  return (
    <ul className="divide-y divide-white/8 text-sm">
      {entries.map((entry) => (
        <li
          key={entry.registrationId}
          className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <Link
              to="/admin/tournaments/$id"
              params={{ id: entry.tournamentId }}
              className="truncate font-medium text-foreground transition hover:text-foreground/80"
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
  );
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
  const isMobile = useIsMobile();
  const [panelTab, setPanelTab] = useState<PanelTab>("roster");
  const [liveMembers, setLiveMembers] = useState<TeamMember[] | null>(null);
  const [rosterGame, setRosterGame] = useState<Team["game"] | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [tournamentHistory, setTournamentHistory] = useState<RegistrationHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  useEffect(() => {
    setPanelTab("roster");
  }, [team.id]);

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
  const rosterSourceLabel = rosterLoading
    ? "Loading live roster…"
    : isLive
      ? "Live team roster"
      : team.rosterTeamId
        ? "Registration snapshot"
        : null;

  const hasFooterActions =
    (decisionMode === "review" && onApprove && onReject) ||
    (decisionMode === "approved" && onReject) ||
    (decisionMode === "rejected" && onApprove);

  function renderRosterPanel() {
    if (rosterLoading) {
      return (
        <TeamRosterTableSkeleton
          rows={Math.max(team.members.length, 3)}
          variant="live"
          showIgnColumn={showIgnColumn}
        />
      );
    }

    if (isMobile) {
      return (
        <TeamModalRosterMobileList
          variant={isLive ? "live" : "snapshot"}
          liveMembers={activeRoster ?? []}
          snapshotMembers={team.members}
          showIgn={showIgnColumn}
          compact
        />
      );
    }

    if (isLive) {
      return (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 py-1 text-[10px] font-tech uppercase tracking-wider-2">
                Player
              </TableHead>
              {showIgnColumn && (
                <TableHead className="h-8 py-1 text-[10px] font-tech uppercase tracking-wider-2">
                  IGN
                </TableHead>
              )}
              <TableHead className="h-8 py-1 text-[10px] font-tech uppercase tracking-wider-2">
                Role
              </TableHead>
              <TableHead className="h-8 py-1 text-[10px] font-tech uppercase tracking-wider-2">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeRoster.map((member) => (
              <TableRow key={member.userId}>
                <TableCell className="py-2">
                  <MemberNameStack
                    displayName={member.displayName}
                    discordUsername={member.discordUsername}
                    profileSlug={member.profileSlug}
                    size="sm"
                  />
                </TableCell>
                {showIgnColumn && (
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {member.ign || "—"}
                  </TableCell>
                )}
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {member.role || "—"}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className="font-tech text-[10px] uppercase">
                    {member.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (team.members.length > 0) {
      return (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 py-1 text-[10px] font-tech uppercase tracking-wider-2">
                IGN
              </TableHead>
              <TableHead className="h-8 py-1 text-[10px] font-tech uppercase tracking-wider-2">
                Role
              </TableHead>
              <TableHead className="h-8 py-1 text-[10px] font-tech uppercase tracking-wider-2">
                Discord
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.members.map((member, index) => (
              <TableRow key={`${member.ign}-${member.role}-${index}`}>
                <TableCell className="py-2 font-medium">{member.ign}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {member.role || "—"}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {formatDiscord(member.discord)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No roster players on this registration.
      </p>
    );
  }

  return (
    <AdaptiveModal open onOpenChange={(open) => !open && onClose()}>
      <AdaptiveModalContent
        className="flex max-h-[min(92dvh,42rem)] flex-col overflow-hidden border-border bg-card sm:max-w-3xl"
        mobileSize="full"
      >
        <AdaptiveModalHeader className="space-y-3 py-3 sm:py-4">
          <div className="flex items-start gap-3 pr-8 sm:pr-10">
            <div className="grid h-10 w-10 shrink-0 place-items-center border border-border bg-secondary font-tech text-xs tracking-wider">
              {team.tag}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <AdaptiveModalTitle className="text-lg sm:text-xl">{team.name}</AdaptiveModalTitle>
                <Badge
                  variant={registrationStatusVariant(team.status)}
                  className="font-tech text-[10px] uppercase"
                >
                  {team.status}
                </Badge>
              </div>
              <dl className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {tournamentName ? (
                  <div className="min-w-0">
                    <dt className="sr-only">Tournament</dt>
                    <dd className="truncate">
                      <Link
                        to="/admin/tournaments/$id"
                        params={{ id: team.tournamentId }}
                        className="text-foreground/90 transition hover:text-foreground"
                      >
                        {tournamentName}
                      </Link>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <span className="text-muted-foreground/70">Captain </span>
                  <span className="text-foreground/90">{team.captain}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/70">Registered </span>
                  <span className="text-foreground/90">{team.registrationDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/70">Roster </span>
                  <span className="text-foreground/90">{rosterCount} players</span>
                </div>
                {rosterSourceLabel ? (
                  <div className="font-tech text-[10px] uppercase tracking-wider-2">
                    {rosterSourceLabel}
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </AdaptiveModalHeader>

        {decisionMode === "review" ? (
          <p className="shrink-0 border-b border-amber-400/20 bg-amber-400/5 px-4 py-2 text-xs leading-snug text-amber-100/90 sm:px-6">
            Review the roster, then approve or decline using the buttons below.
          </p>
        ) : null}

        <div className="shrink-0 flex border-b border-white/8 px-4 sm:px-6">
          {(["roster", "history"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPanelTab(tab)}
              className={cn(
                "touch-target flex-1 border-b-2 px-2 py-2.5 font-tech text-[10px] uppercase tracking-wider-2 transition",
                panelTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {tab === "roster"
                ? `Roster (${rosterCount})`
                : historyLoading
                  ? "History"
                  : `History (${tournamentHistory.length})`}
            </button>
          ))}
        </div>

        <AdaptiveModalBody className="min-h-0 flex-1 space-y-0 py-3 sm:py-4">
          {panelTab === "roster" ? renderRosterPanel() : null}
          {panelTab === "history" ? (
            historyLoading ? (
              <TournamentHistoryListSkeleton rows={3} />
            ) : (
              <TournamentHistoryList entries={tournamentHistory} />
            )
          ) : null}
        </AdaptiveModalBody>

        <AdaptiveModalFooter className="gap-2 sm:gap-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="font-tech uppercase tracking-wider"
            >
              Close
            </Button>

            {hasFooterActions ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {decisionMode === "review" && onApprove && onReject ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUpdating}
                      className="border-destructive/30 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRejectConfirmOpen(true)}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Decline
                    </Button>
                    <Button
                      type="button"
                      disabled={isUpdating}
                      className="bg-emerald-500 font-tech text-[10px] uppercase tracking-wider-2 text-white hover:bg-emerald-400"
                      onClick={() => setApproveConfirmOpen(true)}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </>
                ) : null}

                {decisionMode === "approved" && onReject ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUpdating}
                    className="border-destructive/30 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setRejectConfirmOpen(true)}
                  >
                    <UserX className="mr-1.5 h-3.5 w-3.5" />
                    Revoke approval
                  </Button>
                ) : null}

                {decisionMode === "rejected" && onApprove ? (
                  <Button
                    type="button"
                    disabled={isUpdating}
                    className="bg-emerald-500 font-tech text-[10px] uppercase tracking-wider-2 text-white hover:bg-emerald-400"
                    onClick={() => setApproveConfirmOpen(true)}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Approve entry
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </AdaptiveModalFooter>

        <AdaptiveAlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
          <AdaptiveAlertDialogContent>
            <AdaptiveAlertDialogHeader>
              <AdaptiveAlertDialogTitle>Approve {team.name}?</AdaptiveAlertDialogTitle>
              <AdaptiveAlertDialogDescription>
                This confirms the entry for{" "}
                <span className="text-foreground">{tournamentLabel}</span>. The team will count
                toward the registration cap and can be seeded into the bracket.
              </AdaptiveAlertDialogDescription>
            </AdaptiveAlertDialogHeader>
            <AdaptiveAlertDialogFooter>
              <AdaptiveAlertDialogCancel className="font-tech uppercase tracking-wider">
                Cancel
              </AdaptiveAlertDialogCancel>
              <AdaptiveAlertDialogAction
                className="bg-emerald-500 font-tech uppercase tracking-wider text-white hover:bg-emerald-400"
                disabled={isUpdating}
                onClick={() => {
                  setApproveConfirmOpen(false);
                  void onApprove?.();
                }}
              >
                Approve entry
              </AdaptiveAlertDialogAction>
            </AdaptiveAlertDialogFooter>
          </AdaptiveAlertDialogContent>
        </AdaptiveAlertDialog>

        <AdaptiveAlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
          <AdaptiveAlertDialogContent>
            <AdaptiveAlertDialogHeader>
              <AdaptiveAlertDialogTitle>
                {decisionMode === "approved"
                  ? `Revoke approval for ${team.name}?`
                  : `Decline ${team.name}?`}
              </AdaptiveAlertDialogTitle>
              <AdaptiveAlertDialogDescription>
                {decisionMode === "approved" ? (
                  <>
                    This removes the team from the approved field for{" "}
                    <span className="text-foreground">{tournamentLabel}</span>, frees a registration
                    slot, and clears their active tournament link. If the bracket was already
                    generated, update seeding separately.
                  </>
                ) : (
                  <>
                    This declines the registration for{" "}
                    <span className="text-foreground">{tournamentLabel}</span> without using a
                    tournament slot.
                  </>
                )}
              </AdaptiveAlertDialogDescription>
            </AdaptiveAlertDialogHeader>
            <AdaptiveAlertDialogFooter>
              <AdaptiveAlertDialogCancel className="font-tech uppercase tracking-wider">
                Cancel
              </AdaptiveAlertDialogCancel>
              <AdaptiveAlertDialogAction
                className="bg-destructive font-tech uppercase tracking-wider text-destructive-foreground hover:bg-destructive/90"
                disabled={isUpdating}
                onClick={() => {
                  setRejectConfirmOpen(false);
                  void onReject?.();
                }}
              >
                {decisionMode === "approved" ? "Revoke approval" : "Decline entry"}
              </AdaptiveAlertDialogAction>
            </AdaptiveAlertDialogFooter>
          </AdaptiveAlertDialogContent>
        </AdaptiveAlertDialog>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
