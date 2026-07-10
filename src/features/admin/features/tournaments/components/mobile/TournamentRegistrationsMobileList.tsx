import { Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { registrationStatusVariant } from "@/features/admin/features/participants/utils";
import { formatRegistrationDateTime } from "@/features/admin/utils/registration-date";
import { cn } from "@/lib/utils";

export interface TournamentRegistrationMobileRow {
  id: string;
  name: string;
  tag: string;
  captain?: string;
  memberCount: number;
  soloDiscord?: string;
  registrationDate: string;
  status: string;
}

interface TournamentRegistrationsMobileListProps {
  rows: TournamentRegistrationMobileRow[];
  soloEvent: boolean;
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onRemove: (row: TournamentRegistrationMobileRow) => void;
}

/** Mobile-intentional registration queue for tournament detail. */
export function TournamentRegistrationsMobileList({
  rows,
  soloEvent,
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
  onView,
  onRemove,
}: TournamentRegistrationsMobileListProps) {
  return (
    <div className="md:hidden">
      <ul className="divide-y divide-white/[0.06]">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 bg-white/[0.04] font-tech text-[10px] text-white/70">
                {row.tag}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base tracking-wider-2 text-white">{row.name}</p>
                  <Badge variant={registrationStatusVariant(row.status)}>{row.status}</Badge>
                </div>
                {soloEvent ? (
                  <p className="mt-1 text-sm text-white/45">
                    {row.soloDiscord
                      ? row.soloDiscord.startsWith("@")
                        ? row.soloDiscord
                        : `@${row.soloDiscord}`
                      : "Member registration"}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-white/45">
                    {row.captain} · {row.memberCount}{" "}
                    {row.memberCount === 1 ? "player" : "players"}
                  </p>
                )}
                <p
                  className="mt-1 font-tech text-[10px] uppercase tracking-wider text-white/35"
                  title={row.registrationDate}
                >
                  Registered {formatRegistrationDateTime(row.registrationDate)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 flex-1 gap-1.5 border-white/10 bg-white/[0.02] font-tech text-[10px] uppercase tracking-wider hover:bg-white/[0.05]"
                onClick={() => onView(row.id)}
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "min-h-11 flex-1 gap-1.5 border-white/10 bg-white/[0.02] font-tech text-[10px] uppercase tracking-wider",
                  "text-red-400 hover:bg-red-950/20 hover:text-red-300",
                )}
                onClick={() => onRemove(row)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <AdminTablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        onPageChange={onPageChange}
        className="px-0"
      />
    </div>
  );
}
