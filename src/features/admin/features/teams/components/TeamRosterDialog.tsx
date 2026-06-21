import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalDescription,
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
import { isValorantGame } from "@/features/member/utils/valorant-identity";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRemoveTeamMember } from "../hooks/useRemoveTeamMember";
import type { Team } from "../types";
import { TeamRosterMobileList } from "./mobile";

interface TeamRosterDialogProps {
  open: boolean;
  team: Team | null;
  onClose: () => void;
  onUpdated: (team: Team) => void;
}

export function TeamRosterDialog({ open, team, onClose, onUpdated }: TeamRosterDialogProps) {
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

  return (
    <AdaptiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <AdaptiveModalContent className="border-border bg-card sm:max-w-lg" mobileSize="tall">
        <AdaptiveModalHeader>
          <AdaptiveModalTitle>Team Roster</AdaptiveModalTitle>
          <AdaptiveModalDescription>
            [{team.tag}] {team.name} · {roster.length} active player{roster.length === 1 ? "" : "s"}
            . Changes sync to tournaments this team is in.
          </AdaptiveModalDescription>
        </AdaptiveModalHeader>

        <AdaptiveModalBody className="space-y-4 sm:space-y-0">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isMobile ? (
            <TeamRosterMobileList
              team={team}
              removingUserId={removingUserId}
              isSubmitting={isSubmitting}
              onRemove={handleRemove}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Player</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No active players on this roster.
                    </TableCell>
                  </TableRow>
                ) : (
                  roster.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <MemberNameStack
                          displayName={member.displayName}
                          discordUsername={member.discordUsername}
                          profileSlug={member.profileSlug}
                          size="sm"
                        />
                        {showIgnSubline && (
                          <div className="mt-1 text-xs text-muted-foreground">{member.ign}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{member.role}</span>
                          {member.status === "captain" && (
                            <Badge variant="secondary" className="text-[10px] uppercase">
                              Captain
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={isSubmitting || member.status === "captain"}
                          title={
                            member.status === "captain" ? "Cannot remove captain" : "Remove member"
                          }
                          aria-label={`Remove ${member.username}`}
                          onClick={() => handleRemove(member.userId)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {removingUserId === member.userId ? "…" : ""}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </AdaptiveModalBody>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
