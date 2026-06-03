import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Users2, Plus, Trophy, ChevronRight, Crown } from "lucide-react";
import { MemberNav } from "@/features/member/components/MemberNav";
import { getSession } from "@/features/auth/store/session";
import { getTeamByUserId } from "@/lib/mock-teams";
import { GAME_COLOR, GAME_ACCENT } from "@/features/teams/constants";

export const Route = createFileRoute("/teams/")({
  head: () => ({ meta: [{ title: "My Team — Black Rose" }] }),
  component: TeamsIndexPage,
});

function TeamsIndexPage() {
  const navigate = useNavigate();
  const session = getSession();

  useEffect(() => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    if (session.role === "not_verified") {
      navigate({ to: "/waitlist" });
      return;
    }
  }, [navigate, session]);

  if (!session || session.role === "not_verified") return null;

  const team = getTeamByUserId(session.id);
  const isCaptain = team?.captainUserId === session.id;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MemberNav />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-25" />

      {/* Page hero */}
      <div className="relative border-b border-white/6 bg-[oklch(0.06_0_0)] pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(255,255,255,0.04),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Member Console
              </p>
              <h1 className="mt-1 font-display text-4xl tracking-display sm:text-5xl">My Team</h1>
            </div>
            {!team && (
              <Link
                to="/teams/create"
                className="clip-cta inline-flex h-10 items-center gap-2 bg-foreground px-6 font-tech text-xs uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
              >
                <Plus className="h-4 w-4" />
                Create Team
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="relative mx-auto max-w-7xl px-6 py-10">
        {team ? (
          // ── Has a team ──────────────────────────────────────
          <div className="flex flex-col gap-6">
            {/* Team header card */}
            <div className="relative overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)]">
              <div className={`h-[3px] w-full bg-linear-to-r ${GAME_ACCENT[team.game]}`} />
              <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                  {/* Team tag badge */}
                  <div className="grid h-16 w-16 shrink-0 place-items-center border border-white/15 bg-white/5 font-display text-xl tracking-display">
                    {team.tag}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-3xl tracking-display">{team.name}</h2>
                      {isCaptain && (
                        <Crown className="h-4 w-4 text-white/40" aria-label="You are the captain" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-tech uppercase tracking-wider-2 ${GAME_COLOR[team.game]}`}
                    >
                      {team.game}
                    </span>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {
                        team.members.filter((m) => m.status !== "removed" && m.status !== "invited")
                          .length
                      }{" "}
                      active
                      {team.members.filter((m) => m.status === "invited").length > 0 && (
                        <span className="ml-2 text-amber-400">
                          · {team.members.filter((m) => m.status === "invited").length} pending
                          invite
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  to="/teams/$id"
                  params={{ id: team.id }}
                  className="inline-flex h-9 items-center gap-2 border border-white/12 bg-white/5 px-5 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
                >
                  Manage Team
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Roster preview */}
            <div className="border border-white/8 bg-[oklch(0.07_0_0)]">
              <div className="flex items-center justify-between border-b border-white/6 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Roster
                  </p>
                </div>
                <Link
                  to="/teams/$id"
                  params={{ id: team.id }}
                  className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
                >
                  Full Roster →
                </Link>
              </div>
              <div className="flex flex-wrap gap-3 px-5 py-4">
                {team.members
                  .filter((m) => m.status !== "removed")
                  .map((m) => (
                    <div key={m.userId} className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 place-items-center border border-white/10 bg-white/5 font-display text-xs tracking-display">
                        {m.avatarInitials}
                      </div>
                      <div>
                        <p className="text-xs font-medium leading-tight">{m.displayName}</p>
                        <p className="text-[10px] text-muted-foreground">{m.role}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Active tournament */}
            {team.activeTournamentId && (
              <div className="border border-white/8 bg-[oklch(0.07_0_0)]">
                <div className="flex items-center gap-2 border-b border-white/6 px-5 py-3.5">
                  <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Active Tournament
                  </p>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-sm">{team.activeTournamentName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Registration in progress</p>
                  </div>
                  <Link
                    to="/tournaments/$id"
                    params={{ id: team.activeTournamentId }}
                    className="inline-flex h-8 items-center gap-2 border border-white/12 px-4 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
                  >
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          // ── No team yet ─────────────────────────────────────
          <div className="flex flex-col items-center justify-center gap-6 border border-white/8 bg-[oklch(0.07_0_0)] py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center border border-white/10 bg-white/5">
              <Users2 className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <h2 className="font-display text-2xl tracking-display">No Team Yet</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Create a new team to register for tournaments, or ask a captain to invite you.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/teams/create"
                className="clip-cta inline-flex h-10 items-center gap-2 bg-foreground px-6 font-tech text-xs uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
              >
                <Plus className="h-4 w-4" />
                Create a Team
              </Link>
              <Link
                to="/tournaments"
                className="inline-flex h-10 items-center gap-2 border border-white/12 px-6 font-tech text-xs uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
              >
                Browse Tournaments
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
