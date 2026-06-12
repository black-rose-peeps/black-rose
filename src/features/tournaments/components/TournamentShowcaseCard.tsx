import { Link } from "@tanstack/react-router";
import { GAME_LABELS, STATUS_CONFIG } from "../constants";
import {
  isPendingCaptainRegistrationStatus,
  isRegisteredCaptainStatus,
  type CaptainTournamentRegistrationStatus,
} from "../services/team-registration.service";
import {
  formatShortDate,
  formatSlotLabel,
  GAME_EDITORIAL_ACCENT,
  GAME_TOURNAMENT_HEADER,
  getGameAbbrev,
} from "../utils/tournament-display";
import { TournamentCardCtaSkeleton } from "./SelectTeamRegistrationSkeleton";
import type { Tournament } from "../types";

const CTA_LABEL: Record<Tournament["status"], string> = {
  "Registration Open": "Register",
  Live: "View Bracket",
  "Registration Closed": "Registration Closed",
  Completed: "View Results",
  Archived: "View Results",
};

function resolveCardCta(
  tournamentStatus: Tournament["status"],
  captainRegistrationStatus: CaptainTournamentRegistrationStatus = "none",
): { label: string; interactive: boolean; className: string } {
  if (tournamentStatus === "Registration Open") {
    if (isPendingCaptainRegistrationStatus(captainRegistrationStatus)) {
      return {
        label: "Pending Approval",
        interactive: true,
        className:
          "border border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15",
      };
    }
    if (isRegisteredCaptainStatus(captainRegistrationStatus)) {
      return {
        label: "Registered",
        interactive: true,
        className:
          "border border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15",
      };
    }
    return {
      label: "Register",
      interactive: true,
      className: "bg-white text-black hover:bg-white/92",
    };
  }

  if (tournamentStatus === "Live") {
    return {
      label: "View Bracket",
      interactive: true,
      className:
        "border border-white/25 bg-white/6 text-white backdrop-blur-sm hover:bg-white/10",
    };
  }

  if (tournamentStatus === "Completed" || tournamentStatus === "Archived") {
    return {
      label: "View Results",
      interactive: true,
      className: "border border-white/12 bg-white/4 text-white/70 hover:text-white",
    };
  }

  return {
    label: CTA_LABEL[tournamentStatus],
    interactive: false,
    className: "border border-white/8 bg-white/3 text-muted-foreground cursor-default",
  };
}

interface TournamentShowcaseCardProps {
  tournament: Tournament;
  captainRegistrationStatus?: CaptainTournamentRegistrationStatus;
  captainRegistrationLoading?: boolean;
}

export function TournamentShowcaseCard({
  tournament: t,
  captainRegistrationStatus,
  captainRegistrationLoading = false,
}: TournamentShowcaseCardProps) {
  const status = STATUS_CONFIG[t.status];
  const accent = GAME_EDITORIAL_ACCENT[t.game];
  const cover = GAME_TOURNAMENT_HEADER[t.game];
  const cta = resolveCardCta(t.status, captainRegistrationStatus);
  const showCtaSkeleton = captainRegistrationLoading && t.status === "Registration Open";
  const deadlineLabel =
    t.status === "Live" || t.status === "Completed" || t.status === "Archived"
      ? formatShortDate(t.startDate)
      : formatShortDate(t.registrationDeadline);
  const slotsPct = Math.min(100, Math.round((t.teamsRegistered / t.teamCap) * 100));
  const slotsLeft = t.teamCap - t.teamsRegistered;
  const isOver = t.status === "Completed" || t.status === "Archived";

  return (
    <article
      className={`group clip-angle-lg relative flex flex-col overflow-hidden border border-white/[0.07] bg-[oklch(0.055_0_0)] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] transition duration-500 ${accent.glow} hover:shadow-[0_24px_64px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset]`}
    >
      {/* Cyberpunk corner brackets */}
      <span className="pointer-events-none absolute left-0 top-0 z-20 h-5 w-5 border-l border-t border-white/20" />
      <span className="pointer-events-none absolute right-0 top-0 z-20 h-5 w-5 border-r border-t border-white/20" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-20 h-5 w-5 border-b border-l border-white/15" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-20 h-5 w-5 border-b border-r border-white/15" />

      {/* ── Editorial hero ───────────────────────────────────── */}
      <Link
        to="/tournaments/$id"
        params={{ id: t.id }}
        className="relative block h-52 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <img
          src={cover}
          alt={`${t.name} — ${t.game}`}
          loading="lazy"
          className="h-full w-full object-cover object-center brightness-[0.88] contrast-[0.92] saturate-[0.55] transition duration-700 group-hover:scale-[1.04] group-hover:brightness-100 group-hover:contrast-110 group-hover:saturate-110"
        />

        {/* Vignette + editorial fade */}
        <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.055_0_0)] via-[oklch(0.055_0_0/0.45)] to-black/20" />
        <div className="absolute inset-0 bg-linear-to-r from-black/50 via-transparent to-black/30" />

        {/* Scanline texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)",
          }}
        />

        {/* Neon baseline */}
        <div
          className={`absolute inset-x-0 bottom-0 h-px bg-linear-to-r ${accent.line} opacity-80 transition duration-500 group-hover:opacity-100`}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

        {/* Broadcast status */}
        <div className="absolute left-4 top-4 flex items-center gap-2 border border-white/15 bg-black/75 px-2.5 py-1 font-tech text-label-readable uppercase text-white/90 backdrop-blur-md">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
          {status.label}
        </div>

        {/* Game tag — techwear label */}
        <div
          className={`absolute right-4 top-4 border px-2 py-0.5 font-tech text-label-readable uppercase backdrop-blur-md ${accent.tag}`}
        >
          {getGameAbbrev(t.game)}
        </div>

        {/* Vertical editorial index — decorative on larger screens */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute bottom-4 right-4 hidden font-tech text-label-readable uppercase tracking-[0.12em] text-white/35 [writing-mode:vertical-rl] rotate-180 sm:block"
        >
          Black Rose · {t.region}
        </p>
      </Link>

      {/* ── Card body ────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col px-6 pb-6 pt-5">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.18]" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-tech text-label-readable uppercase text-muted-foreground">
              {GAME_LABELS[t.game]}
            </span>
            <span className="text-white/15">·</span>
            <span className="border border-white/10 px-1.5 py-px font-tech text-label-readable uppercase text-white/50">
              {t.format}
            </span>
          </div>

          <Link
            to="/tournaments/$id"
            params={{ id: t.id }}
            className="mt-2 block font-display text-[1.65rem] leading-[1.05] tracking-[0.04em] text-white transition duration-300 group-hover:text-white"
          >
            {t.name}
          </Link>
        </div>

        {/* Luxury stat strip */}
        <dl className="relative mt-5 grid grid-cols-3 divide-x divide-white/[0.08] border-y border-white/[0.08] py-4">
          <div className="pr-3">
            <dt className="font-tech text-label-readable uppercase text-muted-foreground">
              Prize Pool
            </dt>
            <dd className="mt-1.5 truncate font-display text-xl tracking-[0.06em] text-white">
              {t.prizePool}
            </dd>
          </div>
          <div className="px-3">
            <dt className="font-tech text-label-readable uppercase text-muted-foreground">
              Roster
            </dt>
            <dd className="mt-1.5 font-display text-xl tracking-[0.06em] text-white">
              {formatSlotLabel(t.teamsRegistered, t.teamCap)}
            </dd>
          </div>
          <div className="pl-3">
            <dt className="font-tech text-label-readable uppercase text-muted-foreground">
              {t.status === "Live" ? "Started" : "Deadline"}
            </dt>
            <dd className="mt-1.5 font-display text-xl tracking-[0.06em] text-white">
              {deadlineLabel}
            </dd>
          </div>
        </dl>

        {/* Capacity meter */}
        {!isOver && (
          <div className="relative mt-4">
            <div className="mb-1.5 flex items-center justify-between font-tech text-label-readable uppercase text-muted-foreground">
              <span>Capacity</span>
              <span className={slotsLeft === 0 ? "text-white" : "text-white/50"}>
                {slotsLeft === 0 ? "Full" : `${slotsLeft} slots left`}
              </span>
            </div>
            <div className="h-px w-full bg-white/10">
              <div
                className={`h-px transition-all duration-700 ${
                  slotsPct >= 100 ? "bg-white" : slotsPct >= 70 ? "bg-amber-300/90" : "bg-white/70"
                }`}
                style={{ width: `${slotsPct}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        {showCtaSkeleton ? (
          <div className="relative mt-6">
            <TournamentCardCtaSkeleton />
          </div>
        ) : cta.interactive ? (
          <Link
            to="/tournaments/$id"
            params={{ id: t.id }}
            className={`relative mt-6 clip-cta inline-flex h-12 w-full items-center justify-center gap-2 border border-transparent font-tech text-ui-readable uppercase transition duration-300 ${cta.className} ${accent.cta}`}
          >
            {cta.label}
            <span aria-hidden className="text-sm leading-none">
              →
            </span>
          </Link>
        ) : (
          <div
            className={`relative mt-6 clip-cta inline-flex h-12 w-full items-center justify-center font-tech text-ui-readable uppercase ${cta.className}`}
          >
            {cta.label}
          </div>
        )}
      </div>
    </article>
  );
}
