import { Check, ChevronRight, Loader2, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GAME_ACCENT } from "../constants";

import type { Team } from "../types";

interface TeamInviteCardProps {
  team: Team;
  captainName: string;
  responding?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function TeamInviteCard({
  team,
  captainName,
  responding = false,
  onAccept,
  onDecline,
}: TeamInviteCardProps) {
  return (
    <div
      aria-label={`Invitation to ${team.name}`}
      aria-busy={responding}
      className="relative min-w-0 overflow-hidden border border-amber-400/25 bg-[oklch(0.07_0_0)] clip-tab"
    >
      <div
        aria-hidden
        className={`h-[3px] w-full bg-linear-to-r ${GAME_ACCENT[team.game] ?? "from-white/20 to-white/5"}`}
      />
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between sm:gap-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center border border-amber-400/30 bg-amber-400/5 px-1 font-display text-base tracking-display sm:h-16 sm:w-16 sm:text-xl">
            {team.tag}
          </div>
          <div className="min-w-0">
            <p className="font-tech text-label-readable uppercase text-amber-400">
              Team Invitation
            </p>
            <h3 className="break-words font-display text-2xl tracking-display sm:text-3xl">
              {team.name}
            </h3>
            <span className="font-tech text-label-readable uppercase text-foreground/90">
              {team.game}
            </span>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              Invited by {captainName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={responding}
            onClick={onAccept}
            className="clip-cta inline-flex h-11 items-center rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90 motion-reduce:transition-none"
          >
            {responding ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Accept
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={responding}
            onClick={onDecline}
            className="h-11 rounded-none border-white/15 font-tech text-ui-readable uppercase motion-reduce:transition-none"
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </Button>
          <Button
            asChild
            variant="ghost"
            className="h-11 rounded-none font-tech text-label-readable uppercase text-muted-foreground motion-reduce:transition-none"
          >
            <Link to="/teams/$id" params={{ id: team.id }}>
              View team
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
