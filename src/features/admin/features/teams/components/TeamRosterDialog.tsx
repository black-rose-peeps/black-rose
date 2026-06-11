import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isValorantGame } from "@/features/member/utils/valorant-identity";
import { useRemoveTeamMember } from "../hooks/useRemoveTeamMember";
import type { Team } from "../types";

interface TeamRosterDialogProps {
  open: boolean;
  team: Team | null;
  onClose: () => void;
  onUpdated: (team: Team) => void;
}

export function TeamRosterDialog({ open, team, onClose, onUpdated }: TeamRosterDialogProps) {
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">
            Team Roster
          </DialogTitle>
          <DialogDescription>
            [{team.tag}] {team.name} · {roster.length} active player{roster.length === 1 ? "" : "s"}.
            Changes sync to tournaments this team is in.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                      title={member.status === "captain" ? "Cannot remove captain" : "Remove member"}
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
      </DialogContent>
    </Dialog>
  );
}
