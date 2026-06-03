import { Crown, UserMinus, Mail } from "lucide-react";
import type { Team, TeamMember } from "../types";

interface RosterTableProps {
  team: Team;
  currentUserId: string;
  isEditable?: boolean;
  onRemove?: (member: TeamMember) => void;
}

const STATUS_BADGE: Record<TeamMember["status"], { label: string; className: string }> = {
  captain: { label: "Captain", className: "text-white border-white/30 bg-white/5" },
  active: { label: "Active", className: "text-emerald-400 border-emerald-400/25 bg-emerald-400/5" },
  invited: { label: "Invited", className: "text-amber-400 border-amber-400/25 bg-amber-400/5" },
  removed: { label: "Removed", className: "text-muted-foreground border-white/8 bg-white/2" },
};

export function RosterTable({
  team,
  currentUserId,
  isEditable = false,
  onRemove,
}: RosterTableProps) {
  const isCaptain = team.captainUserId === currentUserId;
  const visible = team.members.filter((m) => m.status !== "removed");

  return (
    <div className="overflow-hidden">
      <table className="w-full table-fixed text-sm">
        {/* Fixed column widths — ensures equal gaps regardless of content length */}
        <colgroup>
          <col className="w-[44%]" /> {/* Player */}
          <col className="w-[22%]" /> {/* IGN */}
          <col className="w-[18%]" /> {/* Role */}
          <col className="w-[16%]" /> {/* Status / Actions */}
        </colgroup>

        <thead>
          <tr className="border-b border-white/8 bg-white/2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            <th className="px-4 py-3 text-left font-normal">Player</th>
            <th className="px-4 py-3 text-left font-normal">IGN</th>
            <th className="px-4 py-3 text-left font-normal">Role</th>
            <th className="px-4 py-3 text-right font-normal">
              {isEditable && isCaptain ? "Actions" : "Status"}
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-white/5">
          {visible.map((m) => {
            const badge = STATUS_BADGE[m.status];
            const isMe = m.userId === currentUserId;

            return (
              <tr
                key={m.userId}
                className={`transition hover:bg-white/2 ${isMe ? "bg-white/1.5" : ""}`}
              >
                {/* Player col */}
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center border border-white/10 bg-white/5 font-display text-xs tracking-display">
                      {m.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate font-medium">{m.displayName}</span>
                        {m.status === "captain" && (
                          <Crown className="h-3 w-3 shrink-0 text-white/50" aria-label="Captain" />
                        )}
                      </div>
                      {isMe && (
                        <span className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground/50">
                          you
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* IGN col */}
                <td className="px-4 py-3">
                  <span className="truncate text-muted-foreground">{m.ign}</span>
                </td>

                {/* Role col */}
                <td className="px-4 py-3">
                  <span className="truncate text-muted-foreground">{m.role}</span>
                </td>

                {/* Status / Actions col */}
                <td className="px-4 py-3 text-right">
                  {isEditable && isCaptain && onRemove && m.status !== "captain" ? (
                    <button
                      type="button"
                      onClick={() => onRemove?.(m)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/50 transition hover:text-red-400"
                    >
                      <UserMinus className="h-3 w-3" />
                      {m.status === "invited" ? "Cancel" : "Remove"}
                    </button>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-tech uppercase tracking-wider-2 ${badge.className}`}
                    >
                      {m.status === "invited" && <Mail className="h-2.5 w-2.5" />}
                      {badge.label}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
