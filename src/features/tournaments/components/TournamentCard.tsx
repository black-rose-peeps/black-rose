import { Link } from "@tanstack/react-router";
import { Users, Calendar, Trophy, Layers } from "lucide-react";
import { GAME_LABELS, STATUS_CONFIG } from "../constants";
import type { Tournament } from "../types";

const GAME_ACCENT: Record<Tournament["game"], string> = {
  Valorant: "from-red-500/20 via-red-500/5 to-transparent",
  MLBB: "from-sky-500/20 via-sky-500/5 to-transparent",
  CS2: "from-amber-500/20 via-amber-500/5 to-transparent",
};

const GAME_TAG_COLOR: Record<Tournament["game"], string> = {
  Valorant: "text-red-400",
  MLBB: "text-sky-400",
  CS2: "text-amber-400",
};

interface TournamentCardProps {
  tournament: Tournament;
}

export function TournamentCard({ tournament: t }: TournamentCardProps) {
  const status = STATUS_CONFIG[t.status];
  const slotsLeft = t.teamCap - t.teamsRegistered;
  const slotsPct = Math.round((t.teamsRegistered / t.teamCap) * 100);
  const isOver = t.status === "Completed" || t.status === "Archived";

  return (
    <article className="group relative flex flex-col overflow-hidden border border-white/8 bg-[oklch(0.08_0_0)] transition duration-300 hover:border-white/18 hover:bg-[oklch(0.10_0_0)]">
      {/* Game-tinted top accent bar */}
      <div className={`h-[3px] w-full bg-linear-to-r ${GAME_ACCENT[t.game]}`} />

      {/* Shimmer on hover */}
      <div className="pointer-events-none absolute inset-x-0 top-[3px] h-px bg-linear-to-r from-transparent via-white/15 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="flex flex-1 flex-col gap-5 p-5">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`text-[10px] font-tech uppercase tracking-wider-2 ${GAME_TAG_COLOR[t.game]}`}
            >
              {GAME_LABELS[t.game]}
            </span>
            <h3 className="mt-1 font-display text-xl leading-snug tracking-display">{t.name}</h3>
          </div>
          <span
            className={`mt-1 shrink-0 inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-tech uppercase tracking-wider-2 ${status.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* Key facts — 2-column grid */}
        <dl className="grid grid-cols-2 gap-2">
          <Stat icon={<Trophy className="h-3.5 w-3.5" />} label="Prize pool" value={t.prizePool} />
          <Stat icon={<Layers className="h-3.5 w-3.5" />} label="Format" value={t.format} small />
          <Stat
            icon={<Calendar className="h-3.5 w-3.5" />}
            label={isOver ? "Played" : "Starts"}
            value={t.startDate}
          />
          <Stat
            icon={<Users className="h-3.5 w-3.5" />}
            label="Teams"
            value={
              <span>
                <span className="text-white">{t.teamsRegistered}</span>
                <span className="text-muted-foreground"> / {t.teamCap}</span>
              </span>
            }
          />
        </dl>

        {/* Slot fill bar */}
        {!isOver && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              <span>Slots filled</span>
              <span className={slotsLeft === 0 ? "text-white" : "text-muted-foreground"}>
                {slotsLeft === 0 ? "Full" : `${slotsLeft} left`}
              </span>
            </div>
            <div className="h-[3px] w-full rounded-full bg-white/8">
              <div
                className={`h-[3px] rounded-full transition-all duration-500 ${
                  slotsPct >= 100 ? "bg-white" : slotsPct >= 70 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${slotsPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Region */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Region
          </span>
          <span className="border border-white/10 px-1.5 py-0.5 text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            {t.region}
          </span>
        </div>
      </div>

      {/* CTA footer */}
      <div className="border-t border-white/6 px-5 py-4">
        {t.status === "Registration Open" ? (
          <Link
            to="/tournaments/$id"
            params={{ id: t.id }}
            className="clip-cta inline-flex h-10 w-full items-center justify-center gap-2 bg-white font-tech text-xs uppercase tracking-wider-2 text-black transition hover:bg-white/90"
          >
            Register Now <span aria-hidden>→</span>
          </Link>
        ) : t.status === "Live" ? (
          <Link
            to="/tournaments/$id"
            params={{ id: t.id }}
            className="inline-flex h-10 w-full items-center justify-center gap-2 border border-white/20 bg-white/8 font-tech text-xs uppercase tracking-wider-2 text-white transition hover:bg-white/12"
          >
            View Bracket <span aria-hidden>→</span>
          </Link>
        ) : (
          <Link
            to="/tournaments/$id"
            params={{ id: t.id }}
            className="inline-flex h-10 w-full items-center justify-center font-tech text-xs uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
          >
            {isOver ? "View Results" : "Registration Closed"}
          </Link>
        )}
      </div>
    </article>
  );
}

// Small reusable stat cell
function Stat({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-sm border border-white/6 bg-white/[0.03] px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          {label}
        </dt>
        <dd
          className={`mt-0.5 truncate font-display tracking-display ${small ? "text-sm" : "text-base"}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
