import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Team } from "../types";

interface TeamInviteBannerProps {
  team: Team;
  captainName: string;
  responding?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function TeamInviteBanner({
  team,
  captainName,
  responding = false,
  onAccept,
  onDecline,
}: TeamInviteBannerProps) {
  return (
    <div className="mb-6 border border-amber-400/25 bg-amber-400/5 p-5 clip-tab">
      <p className="text-[10px] font-tech uppercase tracking-wider-2 text-amber-400">
        Pending Invitation
      </p>
      <p className="mt-2 text-sm text-foreground">
        <span className="font-medium">{captainName}</span> invited you to join{" "}
        <span className="font-medium">
          {team.name} [{team.tag}]
        </span>{" "}
        · {team.game}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Accept to join the roster and register for tournaments with this team.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={responding}
          onClick={onAccept}
          className="clip-cta rounded-none bg-white font-tech text-[10px] uppercase tracking-wider-2 text-black hover:bg-white/90"
        >
          {responding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Accept Invite
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
      </div>
    </div>
  );
}
