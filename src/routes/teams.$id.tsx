import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, Trophy, ChevronRight, Search, X, Crown } from "lucide-react";
import { MemberNav } from "@/features/member/components/MemberNav";
import { getSession } from "@/features/auth/store/session";
import { getTeamById, mockRegisteredMembers } from "@/lib/mock-teams";
import { RosterTable } from "@/features/teams/components/RosterTable";
import { GAME_COLOR, GAME_ACCENT, MAX_TEAM_SIZE } from "@/features/teams/constants";
import type { Team, TeamMember } from "@/features/teams/types";

export const Route = createFileRoute("/teams/$id")({
  loader: ({ params }): { team: Team } => {
    const team = getTeamById(params.id);
    if (!team) throw notFound();
    return { team };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.team?.name ?? "Team"} — Black Rose` }],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p className="font-display text-5xl tracking-display">404</p>
      <p className="text-muted-foreground">Team not found.</p>
      <Link
        to="/teams"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to Teams
      </Link>
    </div>
  ),
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { team: initialTeam } = Route.useLoaderData();

  // Local state mirrors team so we can simulate invite/remove without a backend
  const [team, setTeam] = useState<Team>(initialTeam);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

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

  if (!session) return null;

  const isCaptain = team.captainUserId === session.id;
  const isMember = team.members.some((m) => m.userId === session.id && m.status !== "removed");

  // Members not already on the team
  const existingIds = new Set(team.members.map((m) => m.userId));
  const searchResults = mockRegisteredMembers.filter(
    (m) =>
      !existingIds.has(m.userId) &&
      (inviteSearch === "" ||
        m.username.toLowerCase().includes(inviteSearch.toLowerCase()) ||
        m.displayName.toLowerCase().includes(inviteSearch.toLowerCase())),
  );

  const activeCount = team.members.filter(
    (m) => m.status === "captain" || m.status === "active",
  ).length;
  const pendingCount = team.members.filter((m) => m.status === "invited").length;
  const canInvite = team.members.filter((m) => m.status !== "removed").length < MAX_TEAM_SIZE;

  function handleRemove(member: TeamMember) {
    // TODO: DELETE /api/teams/:id/members/:userId
    setTeam((t) => ({
      ...t,
      members: t.members.map((m) => (m.userId === member.userId ? { ...m, status: "removed" } : m)),
    }));
  }

  function handleInvite(
    userId: string,
    username: string,
    displayName: string,
    avatarInitials: string,
  ) {
    // TODO: POST /api/teams/:id/invites
    const newMember: TeamMember = {
      userId,
      username,
      displayName,
      avatarInitials,
      ign: username,
      role: "TBD",
      status: "invited",
      joinedAt: new Date().toISOString(),
    };
    setTeam((t) => ({ ...t, members: [...t.members, newMember] }));
    setInvitedIds((s) => new Set([...s, userId]));
    setInviteSearch("");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MemberNav />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-25" />

      <main className="relative mx-auto max-w-5xl px-6 pt-24 pb-16">
        {/* Back */}
        <Link
          to="/teams"
          className="mb-6 inline-flex items-center gap-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My Team
        </Link>

        {/* ── Team banner ─────────────────────────────────── */}
        <div className="relative mb-6 overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)]">
          <div className={`h-[3px] w-full bg-linear-to-r ${GAME_ACCENT[team.game]}`} />
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />

          <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="grid h-20 w-20 shrink-0 place-items-center border-2 border-white/15 bg-white/5 font-display text-2xl tracking-display">
                {team.tag}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-3xl tracking-display sm:text-4xl">
                    {team.name}
                  </h1>
                  {isCaptain && <Crown className="h-4 w-4 text-white/40" aria-label="Captain" />}
                </div>
                <span
                  className={`text-[10px] font-tech uppercase tracking-wider-2 ${GAME_COLOR[team.game]}`}
                >
                  {team.game}
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{activeCount} active</span>
                  {pendingCount > 0 && (
                    <span className="text-amber-400">{pendingCount} pending invite</span>
                  )}
                  <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Captain actions */}
            {isCaptain && (
              <div className="flex flex-wrap gap-2">
                {canInvite && (
                  <button
                    type="button"
                    onClick={() => setInviteOpen((v) => !v)}
                    className="inline-flex h-9 items-center gap-2 border border-white/12 bg-white/5 px-4 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite Member
                  </button>
                )}
                {team.activeTournamentId ? (
                  <Link
                    to="/tournaments/$id"
                    params={{ id: team.activeTournamentId }}
                    className="inline-flex h-9 items-center gap-2 border border-white/12 px-4 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    View Tournament
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <Link
                    to="/tournaments"
                    className="clip-cta inline-flex h-9 items-center gap-2 bg-foreground px-4 font-tech text-[10px] uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    Register for Tournament
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Invite panel (captain only) ──────────────────── */}
        {inviteOpen && isCaptain && (
          <div className="mb-6 border border-white/8 bg-[oklch(0.07_0_0)]">
            <div className="flex items-center justify-between border-b border-white/6 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  Invite a Member
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInviteOpen(false);
                  setInviteSearch("");
                }}
                className="text-muted-foreground/50 transition hover:text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by username…"
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  className="h-10 w-full border border-border bg-secondary pl-9 pr-4 text-sm outline-none transition focus:border-foreground"
                />
              </div>

              {/* Results */}
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {inviteSearch
                    ? "No members found."
                    : "All registered members are already on your team."}
                </p>
              ) : (
                <ul className="divide-y divide-white/6">
                  {searchResults.slice(0, 8).map((m) => {
                    const alreadyInvited = invitedIds.has(m.userId);
                    return (
                      <li key={m.userId} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center border border-white/10 bg-white/5 font-display text-xs tracking-display">
                            {m.avatarInitials}
                          </div>
                          <span className="text-sm font-medium">{m.displayName}</span>
                        </div>
                        <button
                          type="button"
                          disabled={alreadyInvited}
                          onClick={() =>
                            handleInvite(m.userId, m.username, m.displayName, m.avatarInitials)
                          }
                          className={`inline-flex h-8 items-center gap-1.5 border px-3 font-tech text-[10px] uppercase tracking-wider-2 transition ${
                            alreadyInvited
                              ? "cursor-not-allowed border-emerald-400/20 bg-emerald-400/5 text-emerald-400"
                              : "border-white/12 text-muted-foreground hover:border-white/25 hover:text-foreground"
                          }`}
                        >
                          {alreadyInvited ? "Invited" : "Invite"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-4 text-[10px] text-muted-foreground/50">
                Invites are sent via Discord. The member must accept to join the roster. (
                {MAX_TEAM_SIZE - team.members.filter((m) => m.status !== "removed").length} slots
                remaining)
              </p>
            </div>
          </div>
        )}

        {/* ── Roster ──────────────────────────────────────── */}
        <div className="border border-white/8 bg-[oklch(0.07_0_0)]">
          <div className="flex items-center justify-between border-b border-white/6 px-5 py-3.5">
            <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Roster · {team.members.filter((m) => m.status !== "removed").length} / {MAX_TEAM_SIZE}
            </p>
            {!isMember && (
              <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/50">
                View only
              </span>
            )}
          </div>
          <div className="p-0">
            <RosterTable
              team={team}
              currentUserId={session.id}
              isEditable={isCaptain}
              onRemove={handleRemove}
            />
          </div>
        </div>

        {/* ── Active tournament ────────────────────────────── */}
        {team.activeTournamentId && (
          <div className="mt-6 border border-white/8 bg-[oklch(0.07_0_0)]">
            <div className="flex items-center gap-2 border-b border-white/6 px-5 py-3.5">
              <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                Active Tournament
              </p>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-sm">{team.activeTournamentName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Registration pending admin approval
                </p>
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
      </main>
    </div>
  );
}
