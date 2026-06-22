import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { GAME_COLOR } from "@/features/teams/constants";
import { isValorantGame } from "@/features/member/utils/valorant-identity";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useRemoveTeamMember } from "../hooks/useRemoveTeamMember";
import type { Team } from "../types";
import { getTeamCaptainUsername } from "../utils";
import { TeamRosterMobileList } from "./mobile";

interface TeamRosterDialogProps {
  open: boolean;
  team: Team | null;
  onClose: () => void;
  onUpdated: (team: Team) => void;
  onAddMember?: () => void;
}

export function TeamRosterDialog({
  open,
  team,
  onClose,
  onUpdated,
  onAddMember,
}: TeamRosterDialogProps) {
  const isMobile = useIsMobile();
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const { submit, isSubmitting, error, resetError } = useRemoveTeamMember();

  useEffect(() => {
    if (!open) {
      setRemovingUserId(null);
      resetError();
    }
  }, [open, resetError]);

  async function handleRemove(userId: string) {
    if (!team) return;
    setRemovingUserId(userId);
    try {
      const updated = await submit(team.id, userId);
      onUpdated(updated);
    } catch {
      // error shown in UI
    } finally {
      setRemovingUserId(null);
    }
  }

  if (!team) return null;

  const roster = team.members.filter((m) => m.status === "captain" || m.status === "active");
  const showIgnSubline = !isValorantGame(team.game);
  const captain = getTeamCaptainUsername(team);

  return (
    <AdaptiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <AdaptiveModalContent
        className="flex max-h-[min(92dvh,42rem)] flex-col overflow-hidden border-border bg-card sm:max-w-2xl"
        mobileSize="full"
      >
        <AdaptiveModalHeader className="space-y-3 py-3 sm:py-4">
          <div className="flex items-start gap-3 pr-8 sm:pr-10">
            <div className="grid h-10 w-10 shrink-0 place-items-center border border-border bg-secondary font-tech text-xs tracking-wider">
              {team.tag}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <AdaptiveModalTitle className="text-lg sm:text-xl">{team.name}</AdaptiveModalTitle>
              <dl className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <div>
                  <span className="text-muted-foreground/70">Game </span>
                  <span
                    className={cn("font-tech uppercase tracking-wider-2", GAME_COLOR[team.game])}
                  >
                    {team.game}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground/70">Captain </span>
                  <span className="text-foreground/90">{captain}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/70">Roster </span>
                  <span className="text-foreground/90">
                    {roster.length} active player{roster.length === 1 ? "" : "s"}
                  </span>
                </div>
                {team.activeTournamentId && team.activeTournamentName ? (
                  <div className="min-w-0">
                    <span className="text-muted-foreground/70">Active event </span>
                    <Link
                      to="/admin/tournaments/$id"
                      params={{ id: team.activeTournamentId }}
                      className="text-foreground/90 transition hover:text-foreground"
                    >
                      {team.activeTournamentName}
                    </Link>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </AdaptiveModalHeader>

        <AdaptiveModalBody className="min-h-0 flex-1 space-y-3 py-3 sm:py-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isMobile ? (
            <TeamRosterMobileList
              team={team}
              removingUserId={removingUserId}
              isSubmitting={isSubmitting}
              onRemove={handleRemove}
              compact
            />
          ) : roster.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active players on this roster.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 py-1 text-[10px] font-tech uppercase tracking-wider-2">
                    Player
                  </TableHead>
                  <TableHead className="h-8 py-1 text-[10px] font-tech uppercase tracking-wider-2">
                    Role
                  </TableHead>
                  <TableHead className="h-8 py-1 text-right text-[10px] font-tech uppercase tracking-wider-2">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((member) => {
                  const isCaptain = member.status === "captain";
                  const isRemoving = removingUserId === member.userId;

                  return (
                    <TableRow key={member.userId}>
                      <TableCell className="py-2">
                        <MemberNameStack
                          displayName={member.displayName}
                          discordUsername={member.discordUsername}
                          profileSlug={member.profileSlug}
                          size="sm"
                        />
                        {showIgnSubline ? (
                          <div className="mt-0.5 text-xs text-muted-foreground">{member.ign}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{member.role}</span>
                          {isCaptain ? (
                            <Badge variant="secondary" className="text-[10px] uppercase">
                              Captain
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={isSubmitting || isCaptain}
                          title={isCaptain ? "Cannot remove captain" : "Remove member"}
                          aria-label={`Remove ${member.username}`}
                          onClick={() => handleRemove(member.userId)}
                        >
                          {isRemoving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-muted-foreground">
            Roster changes sync to tournaments this team is registered for.
          </p>
        </AdaptiveModalBody>

        <AdaptiveModalFooter className="gap-2 sm:gap-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="font-tech uppercase tracking-wider"
            >
              Close
            </Button>
            {onAddMember ? (
              <Button
                type="button"
                className="font-tech text-[10px] uppercase tracking-wider-2"
                disabled={isSubmitting}
                onClick={onAddMember}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Add member
              </Button>
            ) : null}
          </div>
        </AdaptiveModalFooter>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
