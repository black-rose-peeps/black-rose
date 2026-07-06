import type { ReactNode } from "react";
import { Plus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/features/shared/components/Emblem";
import { cn } from "@/lib/utils";

interface TournamentRegistrationsEmptyStateProps {
  soloEvent: boolean;
  addLabel: string;
  capLabel: string;
  teamCap: number;
  capReached: boolean;
  onAdd: () => void;
  className?: string;
}

function HintRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-left">
      <span className="mt-1.5 h-1 w-1 shrink-0 bg-white/30" />
      <span className="text-xs leading-relaxed text-white/45">{children}</span>
    </li>
  );
}

export function TournamentRegistrationsEmptyState({
  soloEvent,
  addLabel,
  capLabel,
  teamCap,
  capReached,
  onAdd,
  className,
}: TournamentRegistrationsEmptyStateProps) {
  const Icon = soloEvent ? UserPlus : Users;

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-dashed border-white/12 bg-[oklch(0.055_0_0)] px-6 py-14 sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.2]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/12 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-linear-to-b from-white/20 via-white/8 to-transparent" />
      <Emblem className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-[0.05]" />

      <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="grid h-16 w-16 place-items-center border border-white/12 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
          <Icon className="h-7 w-7 text-white/70" strokeWidth={1.5} />
        </div>

        <p className="mt-5 font-tech text-[10px] uppercase tracking-[0.22em] text-white/40">
          {soloEvent ? "Player queue" : "Registration queue"}
        </p>

        <h3 className="mt-2 font-display text-2xl tracking-display text-white sm:text-[1.75rem]">
          {soloEvent ? (
            <>
              No players <span className="text-stroke">yet.</span>
            </>
          ) : (
            <>
              No teams <span className="text-stroke">yet.</span>
            </>
          )}
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-white/50">
          {soloEvent
            ? "This event has no member entries on the board. Add players from the console when you're ready, or wait for sign-ups on the public tournament page."
            : "This event has no rosters on the board yet. Staff can add teams from the console, or captains can register once the public event page is open."}
        </p>

        <ul className="mt-5 w-full max-w-md space-y-2 border border-white/8 bg-white/[0.02] px-4 py-3.5">
          {soloEvent ? (
            <>
              <HintRow>Approve entries here before seeding or publishing the bracket.</HintRow>
              <HintRow>
                {teamCap} {teamCap === 1 ? "slot" : "slots"} available under the{" "}
                {capLabel.toLowerCase()}.
              </HintRow>
            </>
          ) : (
            <>
              <HintRow>
                Review captain rosters, approve entries, and manage the waitlist from this panel.
              </HintRow>
              <HintRow>
                Room for {teamCap} {teamCap === 1 ? "team" : "teams"} — {capLabel.toLowerCase()}{" "}
                fills as entries are approved.
              </HintRow>
              <HintRow>
                Public registrations appear here automatically once captains sign up on the event
                page.
              </HintRow>
            </>
          )}
        </ul>

        <Button
          type="button"
          size="sm"
          className="mt-6 gap-2 font-tech uppercase tracking-wider"
          disabled={capReached}
          title={capReached ? `${capLabel} reached` : undefined}
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>

        {capReached ? (
          <p className="mt-3 text-xs text-amber-300/80">
            {capLabel} is full — remove an entry before adding more.
          </p>
        ) : null}
      </div>
    </div>
  );
}
