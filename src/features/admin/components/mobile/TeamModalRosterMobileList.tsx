import { Badge } from "@/components/ui/badge";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import type { TeamMember } from "@/features/teams/types";
import type { MockTeam } from "@/lib/mock-data";

function formatDiscord(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

interface TeamModalRosterMobileListProps {
  variant: "live" | "snapshot";
  liveMembers: TeamMember[];
  snapshotMembers: MockTeam["members"];
  showIgn: boolean;
}

export function TeamModalRosterMobileList({
  variant,
  liveMembers,
  snapshotMembers,
  showIgn,
}: TeamModalRosterMobileListProps) {
  if (variant === "live") {
    if (liveMembers.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-muted-foreground md:hidden">
          No roster players on this registration.
        </p>
      );
    }

    return (
      <ul className="divide-y divide-white/8 md:hidden">
        {liveMembers.map((member) => (
          <li key={member.userId} className="px-4 py-3.5">
            <MemberNameStack
              displayName={member.displayName}
              discordUsername={member.discordUsername}
              profileSlug={member.profileSlug}
              size="sm"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {showIgn ? <span>IGN · {member.ign || "—"}</span> : null}
              <span>Role · {member.role || "—"}</span>
              <Badge variant="outline" className="font-tech text-[10px] uppercase">
                {member.status}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (snapshotMembers.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground md:hidden">
        No roster players on this registration.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/8 md:hidden">
      {snapshotMembers.map((member, index) => (
        <li key={`${member.ign}-${member.role}-${index}`} className="px-4 py-3.5">
          <p className="font-medium">{member.ign}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Role · {member.role || "—"}</span>
            <span>Discord · {formatDiscord(member.discord)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
