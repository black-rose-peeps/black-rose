import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Crown, Hash, Loader2, Users } from "lucide-react";
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
import { registrationActionsEnabled } from "@/features/admin/features/participants/constants/registration-status";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { isValorantGame } from "@/features/member/utils/valorant-identity";
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

  const showReviewActions =
    Boolean(onApprove || onReject) &&
    registrationActionsEnabled(tournamentStatus) &&
    (team.status === "Pending" || team.status === "Previously Competed" || team.status === "Rejected");

  const rosterSource = liveMembers ? "live" : "snapshot";
  const rosterCount = liveMembers?.length ?? team.members.length;
  const showIgnColumn = !rosterGame || !isValorantGame(rosterGame);

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
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading history…
              </div>
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
                  : rosterSource === "live"
                    ? "Live team roster"
                    : "Registration snapshot"}
              </span>
            )}
          </div>

          {rosterLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching current roster…
            </div>
          ) : liveMembers && liveMembers.length > 0 ? (
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
                {liveMembers.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <MemberNameStack
                        displayName={member.displayName}
                        discordUsername={member.discordUsername}
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

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="font-tech uppercase tracking-wider"
          >
            Close
          </Button>
          {showReviewActions && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdating || team.status === "Approved" || !onApprove}
                className="font-tech text-[10px] uppercase tracking-wider-2"
                onClick={() => void onApprove?.()}
              >
                {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Approve
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isUpdating || team.status === "Rejected" || !onReject}
                className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:text-destructive"
                onClick={() => void onReject?.()}
              >
                Reject
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
