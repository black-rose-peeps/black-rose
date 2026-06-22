import { Loader2, Trash2 } from "lucide-react";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isValorantGame } from "@/features/member/utils/valorant-identity";
import type { Team } from "../../types";

interface TeamRosterMobileListProps {
  team: Team;
  removingUserId: string | null;
  isSubmitting: boolean;
  onRemove: (userId: string) => void;
  compact?: boolean;
}

export function TeamRosterMobileList({
  team,
  removingUserId,
  isSubmitting,
  onRemove,
  compact = false,
}: TeamRosterMobileListProps) {
  const roster = team.members.filter((m) => m.status === "captain" || m.status === "active");
  const showIgnSubline = !isValorantGame(team.game);
  const rowClass = compact ? "py-2.5" : "px-4 py-3.5";

  if (roster.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground md:hidden">
        No active players on this roster.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/8 md:hidden">
      {roster.map((member) => {
        const isCaptain = member.status === "captain";
        const isRemoving = removingUserId === member.userId;

        return (
          <li key={member.userId} className={rowClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <MemberNameStack
                  displayName={member.displayName}
                  discordUsername={member.discordUsername}
                  profileSlug={member.profileSlug}
                  size="sm"
                />
                {showIgnSubline ? (
                  <p className="mt-1 text-xs text-muted-foreground">{member.ign}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{member.role}</span>
                  {isCaptain ? (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      Captain
                    </Badge>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="touch-target min-h-11 shrink-0 text-destructive hover:text-destructive"
                disabled={isSubmitting || isCaptain}
                title={isCaptain ? "Cannot remove captain" : "Remove member"}
                aria-label={`Remove ${member.username}`}
                onClick={() => onRemove(member.userId)}
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
