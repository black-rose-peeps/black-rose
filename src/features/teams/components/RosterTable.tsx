import { Link } from "@tanstack/react-router";
import { Crown, UserMinus, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { isValorantGame } from "@/features/member/utils/valorant-identity";
import { getRoleOptionsForGame } from "../constants";
import type { Team, TeamMember, TeamMemberRole } from "../types";

interface RosterTableProps {
  team: Team;
  members?: TeamMember[];
  currentUserId: string;
  isEditable?: boolean;
  onRemove?: (member: TeamMember) => void;
  onRoleChange?: (member: TeamMember, role: TeamMemberRole) => void;
  emptyMessage?: string;
  showStatusColumn?: boolean;
}

const STATUS_BADGE: Record<TeamMember["status"], { label: string; className: string }> = {
  captain: { label: "Captain", className: "text-white border-white/30 bg-white/5" },
  active: { label: "Active", className: "text-emerald-400 border-emerald-400/25 bg-emerald-400/5" },
  invited: { label: "Pending", className: "text-amber-400 border-amber-400/25 bg-amber-400/5" },
  removed: { label: "Removed", className: "text-muted-foreground border-white/8 bg-white/2" },
};

export function RosterTable({
  team,
  members,
  currentUserId,
  isEditable = false,
  onRemove,
  onRoleChange,
  emptyMessage = "No members in this section.",
  showStatusColumn = true,
}: RosterTableProps) {
  const isCaptain = team.captainUserId === currentUserId;
  const roleOptions = getRoleOptionsForGame(team.game);
  const showIgnColumn = !isValorantGame(team.game);
  const visible =
    members ?? team.members.filter((m) => m.status !== "removed");

  if (!visible.length) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col
            className={
              showIgnColumn
                ? showStatusColumn
                  ? "w-[44%]"
                  : "w-[50%]"
                : showStatusColumn
                  ? "w-[56%]"
                  : "w-[60%]"
            }
          />
          {showIgnColumn && (
            <col className={showStatusColumn ? "w-[22%]" : "w-[25%]"} />
          )}
          <col
            className={
              showIgnColumn
                ? showStatusColumn
                  ? "w-[18%]"
                  : "w-[25%]"
                : showStatusColumn
                  ? "w-[28%]"
                  : "w-[40%]"
            }
          />
          {showStatusColumn && <col className="w-[16%]" />}
        </colgroup>

        <thead>
          <tr className="border-b border-white/8 bg-white/2 font-tech text-label-readable uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left font-normal">Player</th>
            {showIgnColumn && <th className="px-4 py-3 text-left font-normal">IGN</th>}
            <th className="px-4 py-3 text-left font-normal">Main Role</th>
            {showStatusColumn && (
              <th className="px-4 py-3 text-right font-normal">
                {isEditable && isCaptain ? "Actions" : "Status"}
              </th>
            )}
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
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {m.profileSlug ? (
                      <Link
                        to="/members/$slug"
                        params={{ slug: m.profileSlug }}
                        className="shrink-0 transition hover:opacity-90"
                      >
                        <MemberAvatar
                          avatarUrl={m.avatarUrl}
                          initials={m.avatarInitials}
                          name={m.displayName}
                          className="h-8 w-8 shrink-0 text-xs"
                        />
                      </Link>
                    ) : (
                      <MemberAvatar
                        avatarUrl={m.avatarUrl}
                        initials={m.avatarInitials}
                        name={m.displayName}
                        className="h-8 w-8 shrink-0 text-xs"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <MemberNameStack
                          displayName={m.displayName}
                          discordUsername={m.discordUsername}
                          profileSlug={m.profileSlug}
                          showYou={isMe}
                          className="min-w-0 flex-1"
                        />
                        {m.status === "captain" && (
                          <Crown className="h-3 w-3 shrink-0 text-white/50" aria-label="Captain" />
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {showIgnColumn && (
                  <td className="px-4 py-3">
                    <span className="truncate text-muted-foreground">{m.ign || "—"}</span>
                  </td>
                )}

                <td className="px-4 py-3">
                  {onRoleChange &&
                  (isCaptain || isMe) &&
                  (m.status === "captain" || m.status === "active") ? (
                    <Select
                      value={m.role}
                      onValueChange={(value) => onRoleChange(m, value as TeamMemberRole)}
                    >
                      <SelectTrigger className="h-8 w-full max-w-[9rem] rounded-none border-white/12 bg-white/5 font-tech text-xs uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-white/12 bg-[oklch(0.1_0_0)]">
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role} className="font-tech text-xs">
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="truncate text-muted-foreground">{m.role || "—"}</span>
                  )}
                </td>

                {showStatusColumn && (
                  <td className="px-4 py-3 text-right">
                    {isEditable && isCaptain && onRemove && m.status !== "captain" ? (
                      <button
                        type="button"
                        onClick={() => onRemove(m)}
                        className="inline-flex cursor-pointer items-center gap-1.5 font-tech text-label-readable uppercase text-muted-foreground/50 transition hover:text-red-400"
                      >
                        <UserMinus className="h-3 w-3" />
                        {m.status === "invited" ? "Cancel" : "Remove"}
                      </button>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-tech text-label-readable uppercase ${badge.className}`}
                      >
                        {m.status === "invited" && <Mail className="h-2.5 w-2.5" />}
                        {badge.label}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
