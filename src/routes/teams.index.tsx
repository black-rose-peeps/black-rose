import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users2, Plus, Trophy, ChevronRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTeamsForUser } from "@/features/admin/features/teams/services/teams.service";
import { MemberHeroBanner, MemberPageLayout, TechPanel } from "@/features/member/components/MemberShell";
import { getSession } from "@/features/auth/store/session";
import { CreateTeamDialog } from "@/features/teams/components/CreateTeamDialog";
import { GAME_COLOR, GAME_ACCENT } from "@/features/teams/constants";
import type { Team } from "@/features/teams/types";

export const Route = createFileRoute("/teams/")({
  validateSearch: (search: Record<string, unknown>) => ({
    create: search.create === true || search.create === "true",
  }),
  head: () => ({ meta: [{ title: "My Teams — Black Rose" }] }),
  component: TeamsIndexPage,
});

function TeamSummaryCard({ team, isCaptain }: { team: Team; isCaptain: boolean }) {
  const activeCount = team.members.filter(
    (m) => m.status !== "removed" && m.status !== "invited",
  ).length;
  const pendingCount = team.members.filter((m) => m.status === "invited").length;

  return (
    <div className="relative overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)] clip-tab">
      <div className={`h-[3px] w-full bg-linear-to-r ${GAME_ACCENT[team.game]}`} />
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
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
              {activeCount} active
              {pendingCount > 0 && (
                <span className="ml-2 text-amber-400">· {pendingCount} pending invite</span>
              )}
            </div>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="clip-cta rounded-none border-white/15 bg-white/5 font-tech text-[10px] uppercase tracking-wider-2"
        >
          <Link to="/teams/$id" params={{ id: team.id }}>
            Manage Team
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {team.activeTournamentId && (
        <div className="border-t border-white/6 px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              {team.activeTournamentName}
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-auto rounded-none p-0 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <Link to="/tournaments/$id" params={{ id: team.activeTournamentId }}>
                View →
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamsIndexPage() {
  const navigate = useNavigate();
  const { create: openCreateFromUrl } = Route.useSearch();
  const session = getSession();
  const memberId = session?.id;
  const memberRole = session?.role;
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (openCreateFromUrl && !loading) {
      setCreateOpen(true);
      navigate({ to: "/teams", search: { create: undefined }, replace: true });
    }
  }, [openCreateFromUrl, loading, navigate]);

  useEffect(() => {
    if (!memberId) {
      navigate({ to: "/login" });
      return;
    }
    if (memberRole === "not_verified") {
      navigate({ to: "/waitlist" });
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchTeamsForUser(memberId)
      .then((data) => {
        if (!cancelled) setTeams(data);
      })
      .catch((err) => console.error("[teams] fetchTeamsForUser failed:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, memberId, memberRole]);

  if (!session || memberRole === "not_verified") return null;

  if (loading) {
    return (
      <MemberPageLayout>
        <Skeleton className="mb-8 h-40 w-full rounded-none bg-white/5" />
        <Skeleton className="h-64 w-full rounded-none bg-white/5" />
      </MemberPageLayout>
    );
  }

  return (
    <MemberPageLayout>
      <MemberHeroBanner
        eyebrow="Member Console"
        title="My Teams"
        subtitle={
          teams.length > 0
            ? `${teams.length} team${teams.length === 1 ? "" : "s"} · Create one per game for different tournaments`
            : "Create a team to register for tournaments"
        }
        actions={
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="clip-cta rounded-none bg-white font-tech text-[10px] uppercase tracking-wider-2 text-black hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        }
      />

      {teams.length > 0 ? (
        <div className="flex flex-col gap-5">
          {teams.map((team) => (
            <TeamSummaryCard
              key={team.id}
              team={team}
              isCaptain={team.captainUserId === session.id}
            />
          ))}
        </div>
      ) : (
        <TechPanel label="Teams" title="No Teams Yet">
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <Users2 className="h-10 w-10 text-muted-foreground/30" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a team for each game you compete in, or ask a captain to invite you.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="clip-cta rounded-none bg-white font-tech text-[10px] uppercase tracking-wider-2 text-black hover:bg-white/90"
              >
                <Plus className="h-4 w-4" />
                Create a Team
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
              >
                <Link to="/tournaments">Browse Tournaments</Link>
              </Button>
            </div>
          </div>
        </TechPanel>
      )}

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        memberId={session.id}
        onCreated={(created) => {
          navigate({ to: "/teams/$id", params: { id: created.id } });
        }}
      />
    </MemberPageLayout>
  );
}
