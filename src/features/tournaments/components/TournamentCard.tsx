import { Link } from "@tanstack/react-router";
import { Users, Calendar, Trophy, Layers } from "lucide-react";
import { GAME_LABELS, STATUS_CONFIG } from "../constants";
import {
  isRegisteredCaptainStatus,
  type CaptainTournamentRegistrationStatus,
} from "../services/team-registration.service";
import { TournamentCardCtaSkeleton } from "./SelectTeamRegistrationSkeleton";
import type { Tournament } from "../types";

const GAME_ACCENT: Record<Tournament["game"], string> = {
  Valorant: "from-red-500/20 via-red-500/5 to-transparent",
  "League of Legends": "from-blue-500/20 via-blue-500/5 to-transparent",
  "Teamfight Tactics": "from-violet-500/20 via-violet-500/5 to-transparent",
  "Where Winds Meet": "from-cyan-500/20 via-cyan-500/5 to-transparent",
};

const GAME_TAG_COLOR: Record<Tournament["game"], string> = {
  Valorant: "text-red-400",
  "League of Legends": "text-blue-400",
  "Teamfight Tactics": "text-violet-400",
  "Where Winds Meet": "text-cyan-400",
};

const CTA_LABEL: Record<Tournament["status"], string> = {
  "Registration Open": "Register Now →",
  Live: "View Bracket →",
  "Registration Closed": "Registration Closed",
  Completed: "View Results →",
  Archived: "View Results →",
};

const CTA_STYLE: Record<Tournament["status"], string> = {
  "Registration Open":
    "clip-cta bg-white font-tech text-xs uppercase tracking-wider-2 text-black hover:bg-white/90",
  Live: "border border-white/20 bg-white/8 font-tech text-xs uppercase tracking-wider-2 text-white hover:bg-white/12",
  "Registration Closed":
    "font-tech text-xs uppercase tracking-wider-2 text-muted-foreground cursor-default",
  Completed:
    "font-tech text-xs uppercase tracking-wider-2 text-muted-foreground hover:text-foreground",
  Archived:
    "font-tech text-xs uppercase tracking-wider-2 text-muted-foreground hover:text-foreground",
};

interface TournamentCardProps {
  tournament: Tournament;
  captainRegistrationStatus?: CaptainTournamentRegistrationStatus;
  /** When true, defer the registration CTA until captain status is loaded. */
  captainRegistrationLoading?: boolean;
}

function resolveCardCta(
  tournamentStatus: Tournament["status"],
  captainRegistrationStatus: CaptainTournamentRegistrationStatus = "none",
): { label: string; style: string } {
  if (tournamentStatus === "Registration Open") {
    if (captainRegistrationStatus === "pending") {
      return {
        label: "Pending Approval →",
        style:
          "border border-amber-400/30 bg-amber-400/10 font-tech text-xs uppercase tracking-wider-2 text-amber-300",
      };
    }
    if (isRegisteredCaptainStatus(captainRegistrationStatus)) {
      return {
        label: "Registered →",
        style:
          "border border-emerald-400/30 bg-emerald-400/10 font-tech text-xs uppercase tracking-wider-2 text-emerald-300",
      };
    }
  }

  return {
    label: CTA_LABEL[tournamentStatus],
    style: CTA_STYLE[tournamentStatus],
  };
}

export function TournamentCard({
  tournament: t,
  captainRegistrationStatus,
  captainRegistrationLoading = false,
}: TournamentCardProps) {
  const status = STATUS_CONFIG[t.status];
  const cta = resolveCardCta(t.status, captainRegistrationStatus);
  const showCtaSkeleton = captainRegistrationLoading && t.status === "Registration Open";
  const slotsLeft = t.teamCap - t.teamsRegistered;
  const slotsPct = Math.round((t.teamsRegistered / t.teamCap) * 100);
  const isOver = t.status === "Completed" || t.status === "Archived";

  return (
    <Link
      to="/tournaments/$id"
      params={{ id: t.id }}
      className="group relative flex flex-col overflow-hidden border border-white/8 bg-[oklch(0.08_0_0)] transition duration-300 hover:border-white/18 hover:bg-[oklch(0.10_0_0)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <article className="flex flex-1 flex-col">
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
            <Stat
              icon={<Trophy className="h-3.5 w-3.5" />}
              label="Prize pool"
              value={t.prizePool}
            />
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
                    slotsPct >= 100
                      ? "bg-white"
                      : slotsPct >= 70
                        ? "bg-amber-400"
                        : "bg-emerald-400"
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

        {/* CTA footer — visual label only, navigation is handled by the outer Link */}
        <div className="border-t border-white/6 px-5 py-4">
          {showCtaSkeleton ? (
            <TournamentCardCtaSkeleton />
          ) : (
            <div
              className={`inline-flex h-10 w-full items-center justify-center transition ${cta.style}`}
            >
              {cta.label}
            </div>
          )}
        </div>
      </article>
    </Link>
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
