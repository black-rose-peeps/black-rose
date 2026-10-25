import { Gamepad2, ShieldCheck } from "lucide-react";
import type { AcceptedGameMembership } from "../types";

/** This component accepts only the server's minimal, privacy-authorized projection. */
export function AcceptedGameMemberships({
  memberships,
}: {
  memberships: readonly AcceptedGameMembership[];
}) {
  if (!memberships.length) return null;
  return (
    <ul
      aria-label="Accepted Black Rose game memberships"
      className="min-w-0 divide-y divide-white/8"
    >
      {memberships.map((membership) => (
        <li
          key={membership.gameId}
          className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-white/5">
            {membership.gameIcon ? (
              <img
                src={membership.gameIcon}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-9 w-9 object-contain"
              />
            ) : (
              <Gamepad2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="min-w-0 break-words font-tech text-lg font-semibold leading-snug text-foreground">
              {membership.gameName}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium leading-5 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Accepted member
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
