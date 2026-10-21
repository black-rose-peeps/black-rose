import type { AdminMember } from "../types";
import {
  getDirectoryIdentity,
  getDirectoryIdentityLabel,
  getDirectoryRole,
  matchesDirectoryFilter,
  type DirectoryGame,
} from "../utils/member-directory";

export function MemberGameDetails({
  member,
  game,
}: {
  member: AdminMember;
  game: DirectoryGame | null;
}) {
  if (!game) return null;
  return (
    <span className="mt-1 block space-y-0.5 text-xs text-muted-foreground">
      {matchesDirectoryFilter(member, game, "main", "all") ? (
        <span className="inline-flex border border-white/15 px-1.5 py-0.5 font-tech text-[10px] uppercase">
          Main game
        </span>
      ) : null}
      <span className="block break-words">
        {getDirectoryIdentityLabel(game)}: {getDirectoryIdentity(member, game) ?? "Not provided"}
      </span>
      <span className="block break-words">
        Role: {getDirectoryRole(member, game) ?? "Unknown / not provided"}
      </span>
    </span>
  );
}
