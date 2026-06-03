import { X } from "lucide-react";
import { GhostButton, PrimaryButton } from "./ui";
import type { MockTeam } from "@/lib/mock-data";

/** Admin modal showing full team profile, roster, and history. */
export function TeamModal({ team, onClose }: { team: MockTeam; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-10">
      <div className="relative w-full max-w-2xl border border-border bg-card">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center border border-border bg-secondary text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center border border-border bg-secondary font-display text-xl tracking-wider-2">
              {team.tag}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Team Profile
              </span>
              <h3 className="font-display text-2xl tracking-display">{team.name}</h3>
              <span className="mt-1 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Captain: {team.captain} · Registered {team.registrationDate}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-3 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            <span className="h-px w-8 bg-border" />
            Roster
          </div>
          <div className="divide-y divide-border border border-border">
            {team.members.map((p) => (
              <div key={p.ign} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex flex-col leading-tight">
                  <span className="font-medium">{p.ign}</span>
                  <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    {p.role}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{p.discord}</span>
              </div>
            ))}
          </div>

          <div className="mb-3 mt-6 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            <span className="h-px w-8 bg-border" />
            Tournament History
          </div>
          {team.history.length ? (
            <ul className="space-y-2 text-xs text-muted-foreground">
              {team.history.map((h) => (
                <li key={h} className="border border-border bg-secondary px-3 py-2">
                  {h}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No prior tournaments.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <button className="border border-border bg-secondary px-4 py-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-destructive">
            Remove Team
          </button>
          <PrimaryButton>Approve Team</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
