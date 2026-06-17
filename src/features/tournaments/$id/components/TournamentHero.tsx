import { Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Users, Layers, MapPin } from "lucide-react";
import { GAME_LABELS, STATUS_CONFIG } from "../../constants";
import type { TournamentDetail } from "../../types";

const GAME_TAG_COLOR: Record<TournamentDetail["game"], string> = {
  Valorant: "text-red-400",
  "League of Legends": "text-blue-400",
  "Teamfight Tactics": "text-violet-400",
  "Where Winds Meet": "text-cyan-400",
};

const GAME_GLOW: Record<TournamentDetail["game"], string> = {
  Valorant: "from-red-950/40 via-transparent to-transparent",
  "League of Legends": "from-blue-950/40 via-transparent to-transparent",
  "Teamfight Tactics": "from-violet-950/40 via-transparent to-transparent",
  "Where Winds Meet": "from-cyan-950/40 via-transparent to-transparent",
};

interface TournamentHeroProps {
  tournament: TournamentDetail;
  registrationAction?: React.ReactNode;
}

export function TournamentHero({ tournament: t, registrationAction }: TournamentHeroProps) {
  const status = STATUS_CONFIG[t.status] ?? STATUS_CONFIG["Registration Closed"];
  const isOver = t.status === "Completed" || t.status === "Archived";

  return (
    <section className="relative overflow-hidden border-b border-white/6 pt-24 pb-8 sm:pt-28 sm:pb-12">
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div
        className={`pointer-events-none absolute inset-0 bg-linear-to-br ${GAME_GLOW[t.game]}`}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/12 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <Link
          to="/tournaments"
          className="mb-8 inline-flex min-h-11 items-center gap-2 font-tech text-label-readable uppercase text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Tournaments
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          {/* Left — title block */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`font-tech text-label-readable uppercase ${GAME_TAG_COLOR[t.game]}`}
              >
                {GAME_LABELS[t.game]}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-tech text-label-readable uppercase ${status.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>

            <h1 className="mt-3 font-display text-3xl tracking-display sm:text-5xl md:text-6xl">
              {t.name}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base md:text-lg">
              {t.description}
            </p>
          </div>

          {/* Right — CTA */}
          {!isOver && (
            <div className="w-full shrink-0 sm:w-auto">
              {t.status === "Registration Open" && registrationAction ? (
                <div className="[&_button]:w-full sm:[&_button]:w-auto">{registrationAction}</div>
              ) : t.status === "Registration Open" ? (
                <Link
                  to="/login"
                  className="clip-cta inline-flex h-12 w-full items-center justify-center gap-3 bg-white px-8 font-tech text-sm uppercase tracking-wider-2 text-black transition hover:bg-white/90 sm:w-auto"
                >
                  Join to Register <span aria-hidden>→</span>
                </Link>
              ) : (
                <div className="inline-flex h-12 w-full items-center justify-center gap-3 border border-white/15 bg-white/5 px-8 font-tech text-sm uppercase tracking-wider-2 text-muted-foreground sm:w-auto">
                  {t.status === "Live" ? "In Progress" : "Registration Closed"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meta strip */}
        <div className="mt-8 grid grid-cols-2 gap-px border border-white/8 bg-white/5 sm:mt-10 sm:grid-cols-3 lg:flex lg:flex-wrap">
          {[
            {
              icon: <Calendar className="h-3.5 w-3.5" />,
              label: isOver ? "Played" : "Starts",
              value: t.startDate,
            },
            {
              icon: <Users className="h-3.5 w-3.5" />,
              label: "Teams",
              value: `${t.teamsRegistered} / ${t.teamCap}`,
            },
            { icon: <Layers className="h-3.5 w-3.5" />, label: "Format", value: t.format },
            { icon: <MapPin className="h-3.5 w-3.5" />, label: "Region", value: t.region },
          ].map((m) => (
            <div
              key={m.label}
              className="flex min-w-0 items-center gap-3 bg-[oklch(0.07_0_0)] px-4 py-3 sm:px-5 sm:py-4 lg:min-w-[9.5rem] lg:flex-1"
            >
              <span className="shrink-0 text-muted-foreground">{m.icon}</span>
              <div className="min-w-0">
                <div className="font-tech text-label-readable uppercase text-muted-foreground">
                  {m.label}
                </div>
                <div className="mt-0.5 text-sm font-medium break-words">{m.value}</div>
              </div>
            </div>
          ))}
          {/* Prize — highlighted */}
          <div className="col-span-2 flex min-w-0 items-center gap-3 bg-white px-4 py-3 sm:col-span-1 sm:px-5 sm:py-4 lg:min-w-[9.5rem] lg:flex-1">
            <div className="min-w-0">
              <div className="font-tech text-label-readable uppercase text-black/50">
                Prize Pool
              </div>
              <div className="mt-0.5 font-display text-lg tracking-display text-black break-words sm:text-xl">
                {t.prizePool}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
