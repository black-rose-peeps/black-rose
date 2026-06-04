import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { useParticipants } from "../hooks";
import { registrationStatusVariant } from "../utils";

export function ParticipantsManagement() {
  const { participants, isLoading, error, updatingId, updateStatus } = useParticipants();
  const pagination = usePagination(participants);

  return (
    <AdminSection
      eyebrow="Registrations"
      title="Participants"
      description="All team registrations across tournaments. Approve or reject entries before they appear in bracket seeding."
    >
      {error && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="p-6 pt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Team
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Tournament
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Captain
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Registered
              </TableHead>
              <TableHead className="text-[10px] font-tech uppercase tracking-wider-2">
                Status
              </TableHead>
              <TableHead className="text-right text-[10px] font-tech uppercase tracking-wider-2">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {/* Team name + tag */}
                  <TableCell>
                    <Skeleton className="h-4 w-36 mb-1.5" />
                    <Skeleton className="h-3 w-24" />
                  </TableCell>
                  {/* Tournament */}
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  {/* Captain */}
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  {/* Registered */}
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  {/* Status */}
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton className="h-7 w-16 rounded-md" />
                      <Skeleton className="h-7 w-14 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No registrations yet. Add teams from a tournament detail page.
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedItems.map((team) => {
                const isUpdating = updatingId === team.id;
                return (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="font-display text-base tracking-wider-2">{team.name}</div>
                      <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                        {team.members.length} players · {team.tag}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/admin/tournaments/$id"
                        params={{ id: team.tournamentId }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {team.tournamentName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{team.captain}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {team.registrationDate}
                    </TableCell>
                    <TableCell>
                      <Badge variant={registrationStatusVariant(team.status)}>{team.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isUpdating || team.status === "Approved"}
                          className="font-tech text-[10px] uppercase tracking-wider-2"
                          onClick={() => updateStatus(team.id, "Approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isUpdating || team.status === "Rejected"}
                          className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:text-destructive"
                          onClick={() => updateStatus(team.id, "Rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <AdminTablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
          onPageChange={pagination.setPage}
        />
      </div>
    </AdminSection>
  );
}
