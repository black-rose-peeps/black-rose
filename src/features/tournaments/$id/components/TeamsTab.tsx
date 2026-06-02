import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { TournamentTeam } from "../../types";

interface TeamsTabProps {
  teams: TournamentTeam[];
}

export function TeamsTab({ teams }: TeamsTabProps) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 border border-white/8 bg-[oklch(0.07_0_0)] py-24 text-center">
        <p className="font-display text-2xl tracking-display text-muted-foreground/50">
          No Teams Yet
        </p>
        <p className="text-sm text-muted-foreground/40">
          Teams will appear here once registrations are approved.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {teams.map((team, i) => (
        <TeamRow key={team.id} team={team} rank={i + 1} />
      ))}
    </div>
  );
}

function TeamRow({ team, rank }: { team: TournamentTeam; rank: number }) {
  const [open, setOpen] = useState(false);
  const panelId = `players-panel-${team.id}`;

  return (
    <div className="border border-white/8 bg-[oklch(0.07_0_0)] transition hover:border-white/15">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4">
          {/* Seed / rank badge */}
          <div className="grid h-10 w-10 shrink-0 place-items-center border border-white/10 bg-white/5 font-display text-sm tracking-display">
            {team.seed ?? rank}
          </div>
          <div>
            <div className="font-display text-lg tracking-display leading-tight">{team.name}</div>
            <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              {team.tag} · {team.players.length} players · Capt. {team.captain}
            </div>
          </div>
        </div>
        <span className="shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6 bg-white/2 text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                <th className="px-5 py-2.5 text-left font-normal">#</th>
                <th className="px-3 py-2.5 text-left font-normal">IGN</th>
                <th className="px-5 py-2.5 text-left font-normal">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {team.players.map((p, i) => (
                <tr key={p.ign} className="transition hover:bg-white/2">
                  <td className="px-5 py-3 text-[10px] text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">{p.ign}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{p.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
