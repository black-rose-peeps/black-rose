import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trophy, ChevronRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  acceptTeamInvite,
  declineTeamInvite,
  fetchTeamsForUser,
} from "@/features/admin/features/teams/services/teams.service";
import { MemberHeroBanner, MemberPageLayout, TechPanel } from "@/features/member/components/MemberShell";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { getSession } from "@/features/auth/store/session";
import { syncTeamMembershipNotifications } from "@/features/notifications/services/team-membership-notifications";
import { markTeamInviteRead } from "@/features/notifications/store";
import { CreateTeamDialog } from "@/features/teams/components/CreateTeamDialog";
import { TeamInviteCard } from "@/features/teams/components/TeamInviteCard";
import { GAME_COLOR, GAME_ACCENT } from "@/features/teams/constants";
import { useMemberTeamMembershipRealtime } from "@/features/teams/hooks/useTeamMembersRealtime";
import { fetchTeamsChampionshipMap } from "@/features/championships/services/championship.service";
import { ChampionMarkGroup } from "@/features/championships/components/ChampionMarkGroup";
import { RoseStarMark } from "@/features/championships/components/RoseStarMark";
import type { ChampionshipTitle } from "@/features/championships/types";
import { isActiveMember, isPendingInvite } from "@/features/teams/utils/membership";
import type { Team } from "@/features/teams/types";

export const Route = createFileRoute("/teams/")({
  validateSearch: (search: Record<string, unknown>) => ({
    create: search.create === true || search.create === "true",
  }),
  head: () => ({ meta: [{ title: "My Teams — Black Rose" }] }),
  component: TeamsIndexPage,
});

function TeamSummaryCard({
  team,
  isCaptain,
  championships = [],
}: {
  team: Team;
  isCaptain: boolean;
  championships?: ChampionshipTitle[];
}) {
  const activeCount = team.members.filter(
    (m) => m.status !== "removed" && m.status !== "invited",
  ).length;
  const pendingCount = team.members.filter((m) => m.status === "invited").length;

  return (
    <div className="relative overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)] clip-tab">
      <div className={`h-[3px] w-full bg-linear-to-r ${GAME_ACCENT[team.game]}`} />
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="relative grid h-16 w-16 shrink-0 place-items-center border border-white/15 bg-white/5 font-display text-xl tracking-display">
            {team.tag}
            {championships.length > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center border border-white/15 bg-[oklch(0.07_0_0)] text-white/60"
                title={championships.map((c) => c.tournamentName).join(" · ")}
              >
                <RoseStarMark size={10} />
              </span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-3xl tracking-display">{team.name}</h2>
              {championships.length > 0 && (
                <ChampionMarkGroup titles={championships} size="md" showLabel />
              )}
              {isCaptain && (
                <Crown className="h-4 w-4 text-white/40" aria-label="You are the captain" />
              )}
            </div>
            <span
              className={`font-tech text-label-readable uppercase ${GAME_COLOR[team.game]}`}
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
          className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase"
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
              className="h-auto rounded-none p-0 font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground"
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [respondingTeamId, setRespondingTeamId] = useState<string | null>(null);
  const [championshipsByTeam, setChampionshipsByTeam] = useState<
    Map<string, ChampionshipTitle[]>
  >(new Map());

  const invitedTeams = teams.filter((team) => memberId && isPendingInvite(team, memberId));
  const activeTeams = teams.filter((team) => memberId && isActiveMember(team, memberId));

  function captainName(team: Team): string {
    return team.members.find((m) => m.status === "captain")?.displayName ?? "A captain";
  }

  const reloadTeams = useCallback(async () => {
    if (!memberId) return;
    const data = await fetchTeamsForUser(memberId);
    setTeams(data);
    try {
      const champMap = await fetchTeamsChampionshipMap(data.map((team) => team.id));
      setChampionshipsByTeam(champMap);
    } catch (err) {
      console.warn("[teams] Failed to load championships:", err);
    }
    try {
      await syncTeamMembershipNotifications(memberId);
    } catch (err) {
      console.warn("[teams] Failed to sync membership notifications:", err);
    }
  }, [memberId]);

  const handleMembershipUpdate = useCallback(() => {
    void reloadTeams();
  }, [reloadTeams]);

  useMemberTeamMembershipRealtime(memberId, handleMembershipUpdate);

  async function handleAcceptInvite(teamId: string) {
    if (!memberId) return;
    setRespondingTeamId(teamId);
    try {
      await acceptTeamInvite(teamId, memberId);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to accept invite.");
      return;
    } finally {
      setRespondingTeamId(null);
    }

    markTeamInviteRead(teamId);
    try {
      await reloadTeams();
    } catch (err) {
      console.warn("[teams] Failed to reload teams after accepting invite:", err);
    }
    navigate({ to: "/teams/$id", params: { id: teamId } });
  }

  async function handleDeclineInvite(teamId: string) {
    if (!memberId) return;
    setRespondingTeamId(teamId);
    try {
      await declineTeamInvite(teamId, memberId);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to decline invite.");
      return;
    } finally {
      setRespondingTeamId(null);
    }

    markTeamInviteRead(teamId);
    try {
      await reloadTeams();
    } catch (err) {
      console.warn("[teams] Failed to reload teams after declining invite:", err);
    }
  }

  useEffect(() => {
    if (openCreateFromUrl && !loading) {
      setCreateOpen(true);
      navigate({ to: "/teams", search: { create: false }, replace: true });
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
    setFetchError(null);

    fetchTeamsForUser(memberId)
      .then(async (data) => {
        if (cancelled) return;
        setTeams(data);
        try {
          const champMap = await fetchTeamsChampionshipMap(data.map((team) => team.id));
          if (!cancelled) setChampionshipsByTeam(champMap);
        } catch (err) {
          console.warn("[teams] Failed to load championships:", err);
        }
        try {
          await syncTeamMembershipNotifications(memberId);
        } catch (err) {
          console.warn("[teams] Failed to sync membership notifications:", err);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Failed to load teams.");
        }
      })
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
            ? `${activeTeams.length} active · ${invitedTeams.length} pending invite${invitedTeams.length === 1 ? "" : "s"}`
            : "Create a team to register for tournaments"
        }
        actions={
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="clip-cta inline-flex h-11 items-center rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        }
      />

      {fetchError ? (
        <TechPanel label="Teams" title="Could not load teams">
          <p className="text-sm text-red-400">{fetchError}</p>
        </TechPanel>
      ) : teams.length > 0 ? (
        <div className="flex flex-col gap-5">
          {invitedTeams.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className="font-tech text-label-readable uppercase text-amber-400">
                Pending Invitations
              </p>
              {invitedTeams.map((team) => (
                <TeamInviteCard
                  key={team.id}
                  team={team}
                  captainName={captainName(team)}
                  responding={respondingTeamId === team.id}
                  onAccept={() => void handleAcceptInvite(team.id)}
                  onDecline={() => void handleDeclineInvite(team.id)}
                />
              ))}
            </div>
          )}
          {activeTeams.map((team) => (
            <TeamSummaryCard
              key={team.id}
              team={team}
              isCaptain={team.captainUserId === session.id}
              championships={championshipsByTeam.get(team.id) ?? []}
            />
          ))}
        </div>
      ) : (
        <ArenaEmptyState
          compact
          eyebrow="No Roster"
          title={
            <>
              No teams <span className="text-stroke">yet.</span>
            </>
          }
          description="Create a team for each game you compete in, or ask a captain to invite you."
          actions={
            <>
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="clip-cta inline-flex h-11 items-center rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90"
              >
                <Plus className="h-4 w-4" />
                Create a Team
              </Button>
              <Button
                asChild
                variant="outline"
                className="clip-cta inline-flex h-11 items-center rounded-none border-white/15 font-tech text-ui-readable uppercase"
              >
                <Link to="/tournaments">Browse Tournaments</Link>
              </Button>
            </>
          }
        />
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
