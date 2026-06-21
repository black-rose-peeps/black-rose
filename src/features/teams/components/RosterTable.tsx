import { Link } from "@tanstack/react-router";
import { Crown, Mail, MoreHorizontal, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  onTransferCaptain?: (member: TeamMember) => void;
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

function memberHasCaptainActions(
  member: TeamMember,
  onRemove?: (member: TeamMember) => void,
  onTransferCaptain?: (member: TeamMember) => void,
): boolean {
  if (member.status === "captain") return false;
  if (member.status === "active") return Boolean(onTransferCaptain || onRemove);
  if (member.status === "invited") return Boolean(onRemove);
  return false;
}

function RosterMemberAvatar({ member }: { member: TeamMember }) {
  if (member.profileSlug) {
    return (
      <Link
        to="/members/$slug"
        params={{ slug: member.profileSlug }}
        className="shrink-0 transition hover:opacity-90"
      >
        <MemberAvatar
          avatarUrl={member.avatarUrl}
          initials={member.avatarInitials}
          name={member.displayName}
          className="h-10 w-10 shrink-0 text-xs sm:h-8 sm:w-8"
        />
      </Link>
    );
  }

  return (
    <MemberAvatar
      avatarUrl={member.avatarUrl}
      initials={member.avatarInitials}
      name={member.displayName}
      className="h-10 w-10 shrink-0 text-xs sm:h-8 sm:w-8"
    />
  );
}

function RosterRoleField({
  member,
  team,
  currentUserId,
  isCaptain,
  onRoleChange,
}: {
  member: TeamMember;
  team: Team;
  currentUserId: string;
  isCaptain: boolean;
  onRoleChange?: (member: TeamMember, role: TeamMemberRole) => void;
}) {
  const roleOptions = getRoleOptionsForGame(team.game);
  const isMe = member.userId === currentUserId;
  const canEdit =
    onRoleChange &&
    (isCaptain || isMe) &&
    (member.status === "captain" || member.status === "active");

  if (canEdit) {
    return (
      <Select
        value={member.role}
        onValueChange={(value) => onRoleChange(member, value as TeamMemberRole)}
      >
        <SelectTrigger className="h-11 w-full max-w-none rounded-none border-white/12 bg-white/5 font-tech text-xs uppercase sm:h-8 sm:max-w-[9rem]">
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
    );
  }

  return <span className="truncate text-muted-foreground">{member.role || "—"}</span>;
}

function RosterStatusOrActions({
  member,
  showActionsColumn,
  isCaptain,
  onRemove,
  onTransferCaptain,
}: {
  member: TeamMember;
  showActionsColumn: boolean;
  isCaptain: boolean;
  onRemove?: (member: TeamMember) => void;
  onTransferCaptain?: (member: TeamMember) => void;
}) {
  const badge = STATUS_BADGE[member.status];

  if (
    showActionsColumn &&
    isCaptain &&
    memberHasCaptainActions(member, onRemove, onTransferCaptain)
  ) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="touch-target ml-auto rounded-none text-muted-foreground hover:bg-white/8 hover:text-foreground sm:h-8 sm:w-8"
            aria-label={`Actions for ${member.displayName}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-40 rounded-none border-white/12 bg-[oklch(0.09_0_0)]"
        >
          {member.status === "active" && onTransferCaptain ? (
            <DropdownMenuItem
              onClick={() => onTransferCaptain(member)}
              className="rounded-none font-tech text-ui-readable uppercase focus:bg-white/8"
            >
              <Crown className="mr-2 h-3.5 w-3.5 text-amber-300/80" />
              Make Captain
            </DropdownMenuItem>
          ) : null}
          {onRemove ? (
            <>
              {member.status === "active" && onTransferCaptain ? (
                <DropdownMenuSeparator className="bg-white/8" />
              ) : null}
              <DropdownMenuItem
                onClick={() => onRemove(member)}
                className="rounded-none font-tech text-ui-readable uppercase text-red-400 focus:bg-red-400/10 focus:text-red-400"
              >
                <UserMinus className="mr-2 h-3.5 w-3.5" />
                {member.status === "invited" ? "Cancel Invite" : "Remove"}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-tech text-label-readable uppercase ${badge.className}`}
    >
      {member.status === "invited" && <Mail className="h-2.5 w-2.5" />}
      {badge.label}
    </span>
  );
}

function RosterMobileCard({
  member,
  team,
  currentUserId,
  isCaptain,
  showIgnColumn,
  showStatusColumn,
  showActionsColumn,
  onRemove,
  onTransferCaptain,
  onRoleChange,
}: {
  member: TeamMember;
  team: Team;
  currentUserId: string;
  isCaptain: boolean;
  showIgnColumn: boolean;
  showStatusColumn: boolean;
  showActionsColumn: boolean;
  onRemove?: (member: TeamMember) => void;
  onTransferCaptain?: (member: TeamMember) => void;
  onRoleChange?: (member: TeamMember, role: TeamMemberRole) => void;
}) {
  const isMe = member.userId === currentUserId;

  return (
    <div className={`space-y-3 p-4 ${isMe ? "bg-white/1.5" : ""}`}>
      <div className="flex items-start gap-3">
        <RosterMemberAvatar member={member} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <MemberNameStack
              displayName={member.displayName}
              discordUsername={member.discordUsername}
              profileSlug={member.profileSlug}
              showYou={isMe}
              className="min-w-0 flex-1"
            />
            {member.status === "captain" && (
              <Crown className="h-3 w-3 shrink-0 text-white/50" aria-label="Captain" />
            )}
          </div>
        </div>
        {showStatusColumn && (
          <div className="shrink-0">
            <RosterStatusOrActions
              member={member}
              showActionsColumn={showActionsColumn}
              isCaptain={isCaptain}
              onRemove={onRemove}
              onTransferCaptain={onTransferCaptain}
            />
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {showIgnColumn && (
          <>
            <dt className="font-tech text-label-readable uppercase text-muted-foreground">IGN</dt>
            <dd className="truncate text-muted-foreground">{member.ign || "—"}</dd>
          </>
        )}
        <dt className="font-tech text-label-readable uppercase text-muted-foreground">Main Role</dt>
        <dd>
          <RosterRoleField
            member={member}
            team={team}
            currentUserId={currentUserId}
            isCaptain={isCaptain}
            onRoleChange={onRoleChange}
          />
        </dd>
      </dl>
    </div>
  );
}

export function RosterTable({
  team,
  members,
  currentUserId,
  isEditable = false,
  onRemove,
  onTransferCaptain,
  onRoleChange,
  emptyMessage = "No members in this section.",
  showStatusColumn = true,
}: RosterTableProps) {
  const isCaptain = team.captainUserId === currentUserId;
  const showIgnColumn = !isValorantGame(team.game);
  const visible = members ?? team.members.filter((m) => m.status !== "removed");
  const showActionsColumn = isEditable && isCaptain;

  if (!visible.length) {
    return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-hidden">
      {/* Mobile — card list */}
      <div className="divide-y divide-white/5 md:hidden">
        {visible.map((member) => (
          <RosterMobileCard
            key={member.userId}
            member={member}
            team={team}
            currentUserId={currentUserId}
            isCaptain={isCaptain}
            showIgnColumn={showIgnColumn}
            showStatusColumn={showStatusColumn}
            showActionsColumn={showActionsColumn}
            onRemove={onRemove}
            onTransferCaptain={onTransferCaptain}
            onRoleChange={onRoleChange}
          />
        ))}
      </div>

      {/* Desktop — table */}
      <div className="hidden md:block">
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
            {showIgnColumn && <col className={showStatusColumn ? "w-[22%]" : "w-[25%]"} />}
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
                  {showActionsColumn ? "Actions" : "Status"}
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {visible.map((member) => {
              const isMe = member.userId === currentUserId;

              return (
                <tr
                  key={member.userId}
                  className={`transition hover:bg-white/2 ${isMe ? "bg-white/1.5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <RosterMemberAvatar member={member} />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <MemberNameStack
                            displayName={member.displayName}
                            discordUsername={member.discordUsername}
                            profileSlug={member.profileSlug}
                            showYou={isMe}
                            className="min-w-0 flex-1"
                          />
                          {member.status === "captain" && (
                            <Crown
                              className="h-3 w-3 shrink-0 text-white/50"
                              aria-label="Captain"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {showIgnColumn && (
                    <td className="px-4 py-3">
                      <span className="truncate text-muted-foreground">{member.ign || "—"}</span>
                    </td>
                  )}

                  <td className="px-4 py-3">
                    <RosterRoleField
                      member={member}
                      team={team}
                      currentUserId={currentUserId}
                      isCaptain={isCaptain}
                      onRoleChange={onRoleChange}
                    />
                  </td>

                  {showStatusColumn && (
                    <td className="px-4 py-3 text-right">
                      <RosterStatusOrActions
                        member={member}
                        showActionsColumn={showActionsColumn}
                        isCaptain={isCaptain}
                        onRemove={onRemove}
                        onTransferCaptain={onTransferCaptain}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
