import { Check, ChevronRight, Loader2, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GAME_ACCENT, GAME_COLOR } from "../constants";
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
    <div className="relative overflow-hidden border border-amber-400/25 bg-[oklch(0.07_0_0)] clip-tab">
      <div className={`h-[3px] w-full bg-linear-to-r ${GAME_ACCENT[team.game]}`} />
      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center border border-amber-400/30 bg-amber-400/5 font-display text-xl tracking-display">
            {team.tag}
          </div>
          <div>
            <p className="text-[10px] font-tech uppercase tracking-wider-2 text-amber-400">
              Team Invitation
            </p>
            <h2 className="font-display text-3xl tracking-display">{team.name}</h2>
            <span
              className={`text-[10px] font-tech uppercase tracking-wider-2 ${GAME_COLOR[team.game]}`}
            >
              {team.game}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              Invited by {captainName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={responding}
            onClick={onAccept}
            className="clip-cta rounded-none bg-white font-tech text-[10px] uppercase tracking-wider-2 text-black hover:bg-white/90"
          >
            {responding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Accept
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={responding}
            onClick={onDecline}
            className="rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </Button>
          <Button
            asChild
            variant="ghost"
            className="rounded-none font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground"
          >
            <Link to="/teams/$id" params={{ id: team.id }}>
              View
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
