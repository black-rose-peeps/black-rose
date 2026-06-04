import { Calendar, Crown, Hash, Users } from "lucide-react";
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
import { registrationStatusVariant } from "@/features/admin/features/participants/utils";
import type { MockTeam } from "@/lib/mock-data";

interface TeamModalProps {
  team: MockTeam;
  onClose: () => void;
}

export function TeamModal({ team, onClose }: TeamModalProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-4 pr-6">
            <div className="grid h-12 w-12 shrink-0 place-items-center border border-border bg-secondary font-tech text-sm tracking-wider">
              {team.tag}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="font-display text-xl tracking-wider-2">
                {team.name}
              </DialogTitle>
              <DialogDescription>Registered team details and roster</DialogDescription>
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
                <dd className="ml-auto font-medium">{team.members.length} players</dd>
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
            {team.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prior tournament entries.</p>
            ) : (
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {team.history.map((entry) => (
                  <li key={entry} className="flex gap-2">
                    <span className="text-muted-foreground/50">•</span>
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Roster
          </h3>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  IGN
                </TableHead>
                {/* <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Role
                </TableHead> */}
                <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                  Discord
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.members.map((member) => (
                <TableRow key={`${member.ign}-${member.role}`}>
                  <TableCell className="font-medium">{member.ign}</TableCell>
                  {/* <TableCell>
                    <Badge variant="outline" className="font-tech text-[10px] uppercase">
                      {member.role}
                    </Badge>
                  </TableCell> */}
                  <TableCell className="text-muted-foreground">{member.discord}</TableCell>
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
