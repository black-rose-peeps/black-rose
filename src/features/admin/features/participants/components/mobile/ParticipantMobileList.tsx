import { Link } from "@tanstack/react-router";
import { ClipboardList, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { registrationStatusVariant } from "../../utils";
import type { ParticipantRow } from "../../types";
import {
  canBulkApproveParticipant,
  registrationNeedsReview,
} from "../../constants/registration-status";

interface ParticipantMobileListProps {
  participants: ParticipantRow[];
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  selectedIds: Set<string>;
  isBulkUpdating: boolean;
  onPageChange: (page: number) => void;
  onToggleSelected: (id: string, checked: boolean) => void;
  onOpen: (participant: ParticipantRow) => void;
}

/** Mobile-intentional registration queue — card stack with bulk select. */
export function ParticipantMobileList({
  participants,
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  selectedIds,
  isBulkUpdating,
  onPageChange,
  onToggleSelected,
  onOpen,
}: ParticipantMobileListProps) {
  return (
    <div className="md:hidden">
      <ul className="divide-y divide-white/8">
        {participants.map((participant) => {
          const canSelect = canBulkApproveParticipant(
            participant.status,
            participant.tournamentStatus,
          );
          const isSelected = selectedIds.has(participant.id);
          const needsReview = registrationNeedsReview(
            participant.status,
            participant.tournamentStatus,
          );

          return (
            <li key={participant.id}>
              <div className="flex items-start gap-2 px-4 py-3.5">
                <Checkbox
                  checked={isSelected}
                  disabled={!canSelect || isBulkUpdating}
                  onCheckedChange={(value) => onToggleSelected(participant.id, value === true)}
                  aria-label={`Select ${participant.name}`}
                  className="mt-2.5 shrink-0"
                />

                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpen(participant)}
                    className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 bg-white/5 text-[10px] font-tech tracking-wider-2 transition active:opacity-80"
                    aria-label={`Open ${participant.name}`}
                  >
                    {participant.tag}
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onOpen(participant)}
                      className="block w-full text-left transition active:opacity-80"
                    >
                      <span className="font-display text-base leading-snug tracking-wider">
                        {participant.name}
                      </span>
                    </button>

                    {participant.tournamentId ? (
                      <Link
                        to="/admin/tournaments/$id"
                        params={{ id: participant.tournamentId }}
                        className="mt-0.5 block text-sm leading-snug text-muted-foreground hover:text-foreground"
                      >
                        {participant.tournamentName}
                      </Link>
                    ) : (
                      <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                        {participant.tournamentName}
                      </p>
                    )}

                    <Badge
                      variant={registrationStatusVariant(participant.status)}
                      className="mt-2 max-w-full whitespace-normal rounded-none font-tech text-[9px] uppercase leading-snug"
                    >
                      {participant.status}
                    </Badge>

                    <p className="mt-2 text-sm leading-snug text-muted-foreground">
                      Captain ·{" "}
                      <span className="break-words text-foreground/90">{participant.captain}</span>
                    </p>
                    <p className="mt-1 font-tech text-label-readable uppercase text-muted-foreground">
                      {participant.members.length} players · {participant.registrationDate}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className={cn(
                    "touch-target mt-0.5 h-11 w-11 shrink-0",
                    needsReview
                      ? "border-amber-400/35 bg-amber-400/[0.04] text-amber-100 hover:border-amber-400/50 hover:bg-amber-400/10"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  aria-label={
                    needsReview ? `Review ${participant.name}` : `View ${participant.name}`
                  }
                  onClick={() => onOpen(participant)}
                >
                  {needsReview ? (
                    <ClipboardList className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <AdminTablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={onPageChange}
        className="px-4"
      />
    </div>
  );
}
