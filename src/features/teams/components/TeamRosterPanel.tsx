import { Clock, UserPlus, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TechPanel } from "@/features/member/components/MemberShell";
import { MAX_TEAM_SIZE } from "../constants";
import type { Team, TeamMember } from "../types";
import { RosterTable } from "./RosterTable";

interface TeamRosterPanelProps {
  team: Team;
  currentUserId?: string;
  isEditable?: boolean;
  canInvite?: boolean;
  onInvite?: () => void;
  onRemove?: (member: TeamMember) => void;
  /** Public pages show active roster only — no pending invites or management chrome. */
  variant?: "manage" | "public";
}

function sortActiveMembers(members: TeamMember[]): TeamMember[] {
  return [...members].sort((a, b) => {
    if (a.status === "captain") return -1;
    if (b.status === "captain") return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function TeamRosterPanel({
  team,
  currentUserId = "",
  isEditable = false,
  canInvite = false,
  onInvite,
  onRemove,
  variant = "manage",
}: TeamRosterPanelProps) {
  const isPublic = variant === "public";
  const activeMembers = sortActiveMembers(
    team.members.filter((m) => m.status === "captain" || m.status === "active"),
  );
  const pendingMembers = team.members
    .filter((m) => m.status === "invited")
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const rosterCount = isPublic
    ? activeMembers.length
    : team.members.filter((m) => m.status !== "removed").length;
  const fillPercent = Math.min(100, Math.round((rosterCount / MAX_TEAM_SIZE) * 100));

  return (
    <div className="flex flex-col gap-5">
      <TechPanel
        label="Roster"
        title={isPublic ? "Championship Roster" : "Team Management"}
        icon={<Users2 className="h-3.5 w-3.5" />}
        action={
          !isPublic && isEditable && canInvite && onInvite ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onInvite}
              className="rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite Member
            </Button>
          ) : undefined
        }
        noPadding
      >
        <div className="border-b border-white/6 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-3 font-tech text-label-readable uppercase">
                <span className="text-muted-foreground">Roster capacity</span>
                <span className="text-foreground">
                  {rosterCount} / {MAX_TEAM_SIZE} slots
                </span>
              </div>
              <div className="h-1.5 overflow-hidden bg-white/8">
                <div
                  className="h-full bg-linear-to-r from-emerald-500/80 to-emerald-400/60 transition-all"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 font-tech text-label-readable uppercase text-emerald-400">
                {activeMembers.length} active
              </span>
              {!isPublic && pendingMembers.length > 0 && (
                <span className="border border-amber-400/20 bg-amber-400/5 px-2.5 py-1 font-tech text-label-readable uppercase text-amber-400">
                  {pendingMembers.length} pending
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-white/6">
          <div className="flex items-center gap-2 border-b border-emerald-400/10 bg-emerald-400/3 px-5 py-3">
            <Users2 className="h-3.5 w-3.5 text-emerald-400/70" />
            <div>
              <p className="font-display text-sm tracking-display text-foreground">
                Active Roster
              </p>
              <p className="font-tech text-label-readable uppercase text-muted-foreground">
                Members who accepted the invite
              </p>
            </div>
            <span className="ml-auto font-tech text-ui-readable uppercase text-emerald-400/80">
              {activeMembers.length}
            </span>
          </div>
          <RosterTable
            team={team}
            members={activeMembers}
            currentUserId={currentUserId}
            isEditable={isEditable}
            onRemove={onRemove}
            emptyMessage="No active members yet."
          />
        </div>

        {!isPublic && (
          <div>
            <div className="flex items-center gap-2 border-b border-amber-400/10 bg-amber-400/3 px-5 py-3">
              <Clock className="h-3.5 w-3.5 text-amber-400/70" />
              <div>
                <p className="font-display text-sm tracking-display text-foreground">
                  Pending Invites
                </p>
                <p className="font-tech text-label-readable uppercase text-muted-foreground">
                  Awaiting member response
                </p>
              </div>
              <span className="ml-auto font-tech text-ui-readable uppercase text-amber-400/80">
                {pendingMembers.length}
              </span>
            </div>
            {pendingMembers.length > 0 ? (
              <RosterTable
                team={team}
                members={pendingMembers}
                currentUserId={currentUserId}
                isEditable={isEditable}
                onRemove={onRemove}
                emptyMessage="No pending invites."
              />
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">No pending invites.</p>
                {isEditable && canInvite && onInvite && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onInvite}
                    className="mt-3 rounded-none font-tech text-label-readable uppercase text-muted-foreground hover:text-foreground"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite a member
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </TechPanel>
    </div>
  );
}
