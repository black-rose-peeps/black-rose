import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trophy, ChevronRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  acceptTeamInvite,
  declineTeamInvite,
  fetchTeamsForUser,
  rosterActorFromMemberSession,
} from "@/features/admin/features/teams/services/teams.service";
import { DashboardHubSkeleton } from "@/features/member/components/DashboardHubSkeleton";
import { MemberHeroBanner, TechPanel } from "@/features/member/components/MemberShell";
import { useSyncedMemberSession } from "@/features/auth/hooks/useSyncedMemberSession";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import { syncTeamMembershipNotifications } from "@/features/notifications/services/team-membership-notifications";
import { markTeamInviteRead } from "@/features/notifications/store";
import { CreateTeamDialog } from "@/features/teams/components/CreateTeamDialog";
import { TeamsEmptyState } from "@/features/teams/components/TeamsEmptyState";
import { TeamInviteCard } from "@/features/teams/components/TeamInviteCard";
import { GAME_ACCENT } from "@/features/teams/constants";

import { useMemberTeamMembershipRealtime } from "@/features/teams/hooks/useTeamMembersRealtime";
import { fetchTeamsChampionshipMap } from "@/features/championships/services/championship.service";
import { ChampionMarkGroup } from "@/features/championships/components/ChampionMarkGroup";
import { RoseStarMark } from "@/features/championships/components/RoseStarMark";
import type { ChampionshipTitle } from "@/features/championships/types";
import { isActiveMember, isPendingInvite } from "@/features/teams/utils/membership";
import type { Team } from "@/features/teams/types";
import { MEMBER_READ_QUERY_OPTIONS } from "@/features/member/queries/member-query-options";
import { queryKeys } from "@/lib/query-keys";

const EMPTY_TEAMS: Team[] = [];

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
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)] clip-tab">
      <div
        aria-hidden
        className={`h-[3px] w-full shrink-0 bg-linear-to-r ${GAME_ACCENT[team.game] ?? "from-white/20 to-white/5"}`}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <div className="relative grid h-12 w-12 shrink-0 place-items-center border border-white/15 bg-white/5 px-1 font-display text-base tracking-display sm:h-16 sm:w-16 sm:text-xl">
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
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words font-display text-2xl tracking-display sm:text-3xl">
                {team.name}
              </h3>
              {championships.length > 0 && (
                <ChampionMarkGroup titles={championships} size="md" showLabel />
              )}
              {isCaptain && (
                <Crown
                  className="h-4 w-4 shrink-0 text-white/40"
                  aria-label="You are the captain"
                />
              )}
            </div>
            <span className="font-tech text-label-readable uppercase text-foreground/90">
              {team.game}
            </span>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{isCaptain ? "Captain" : "Member"}</span>
              <span>{activeCount} active</span>
              {pendingCount > 0 && (
                <span className="text-amber-400">
                  {pendingCount} pending invite{pendingCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="clip-cta inline-flex h-11 shrink-0 items-center self-start rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase motion-reduce:transition-none sm:self-center"
        >
          <Link to="/teams/$id" params={{ id: team.id }}>
            {isCaptain ? "Manage team" : "View team"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {team.activeTournamentId && (
        <div className="border-t border-white/6 px-4 py-2 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="break-words">{team.activeTournamentName}</span>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-11 shrink-0 rounded-none px-1 font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground motion-reduce:transition-none"
            >
              <Link to="/tournaments/$id" params={{ id: team.activeTournamentId }}>
                View tournament
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamDirectory({
  navigation,
  openCreateFromUrl = false,
  onCreateIntentConsumed,
}: {
  navigation: ReactNode;
  openCreateFromUrl?: boolean;
  onCreateIntentConsumed: () => void;
}) {
  const navigate = useNavigate();
  const { session, isSyncing } = useSyncedMemberSession();
  const queryClient = useQueryClient();
  const memberId = session?.id;
  const memberRole = session?.role;
  const canReadTeams = !(isSyncing || !memberId || !memberRole || !hasFullMemberAccess(memberRole));
  const teamsQuery = useQuery({
    ...MEMBER_READ_QUERY_OPTIONS,
    queryKey: queryKeys.memberTeams(memberId ?? ""),
    queryFn: () => fetchTeamsForUser(memberId!),
    enabled: canReadTeams,
  });
  const teams = teamsQuery.data ?? EMPTY_TEAMS;
  const loading = isSyncing || teamsQuery.isPending;
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [respondingTeamId, setRespondingTeamId] = useState<string | null>(null);
  const [championshipsByTeam, setChampionshipsByTeam] = useState<Map<string, ChampionshipTitle[]>>(
    new Map(),
  );

  const invitedTeams = teams.filter((team) => memberId && isPendingInvite(team, memberId));
  const activeTeams = teams.filter((team) => memberId && isActiveMember(team, memberId));

  function captainName(team: Team): string {
    return team.members.find((m) => m.status === "captain")?.displayName ?? "A captain";
  }

  const reloadTeams = useCallback(async () => {
    if (!memberId) return;
    setFetchError(null);
    const queryKey = queryKeys.memberTeams(memberId);
    // Let a read started before the mutation settle, then request a new
    // snapshot. Reusing that in-flight result alone can restore an old invite.
    if (queryClient.getQueryState(queryKey)?.fetchStatus === "fetching") {
      await queryClient
        .fetchQuery({
          queryKey,
          queryFn: () => fetchTeamsForUser(memberId),
        })
        .catch(() => undefined);
    }
    await queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false, throwOnError: true });
  }, [memberId, queryClient]);

  const handleMembershipUpdate = useCallback(() => {
    void reloadTeams().catch((err) => {
      console.warn("[teams] Failed to refresh membership:", err);
    });
  }, [reloadTeams]);

  useMemberTeamMembershipRealtime(memberId, handleMembershipUpdate);

  async function handleAcceptInvite(teamId: string) {
    if (!memberId) return;
    setRespondingTeamId(teamId);
    try {
      await acceptTeamInvite(teamId, memberId, rosterActorFromMemberSession());
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
      onCreateIntentConsumed();
    }
  }, [openCreateFromUrl, loading, onCreateIntentConsumed]);

  useEffect(() => {
    if (!canReadTeams || !memberId || !teamsQuery.data) return;

    let cancelled = false;

    void (async () => {
      try {
        const champMap = await fetchTeamsChampionshipMap(
          teams.map((team) => team.id),
          { teams },
        );
        if (!cancelled) setChampionshipsByTeam(champMap);
      } catch (err) {
        console.warn("[teams] Failed to load championships:", err);
      }
      try {
        await syncTeamMembershipNotifications(memberId);
      } catch (err) {
        console.warn("[teams] Failed to sync membership notifications:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canReadTeams, memberId, teams, teamsQuery.data]);

  if (!session || !hasFullMemberAccess(session.role)) {
    return <DashboardHubSkeleton navigation={navigation} />;
  }

  if (loading) {
    return <DashboardHubSkeleton navigation={navigation} />;
  }

  return (
    <>
      <MemberHeroBanner
        eyebrow="Dashboard · Member Console"
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
            className="clip-cta inline-flex h-11 items-center rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90 motion-reduce:transition-none"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        }
      />

      {navigation}

      {teamsQuery.error && !teamsQuery.data ? (
        <TechPanel label="Teams" title="Could not load teams">
          <p className="text-sm text-red-400">
            {teamsQuery.error.message ?? "Failed to load teams."}
          </p>
          <Button
            type="button"
            className="h-11 motion-reduce:transition-none"
            onClick={handleMembershipUpdate}
          >
            Retry
          </Button>
        </TechPanel>
      ) : (
        <div className="flex flex-col gap-5">
          {(fetchError || teamsQuery.error) && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 border border-white/10 px-4 py-2 text-sm"
            >
              <p className="text-red-400">{fetchError ?? teamsQuery.error?.message}</p>
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-none motion-reduce:transition-none"
                onClick={handleMembershipUpdate}
              >
                Retry
              </Button>
            </div>
          )}
          {invitedTeams.length > 0 && (
            <section aria-labelledby="team-invitations-heading" className="flex flex-col gap-3">
              <h2
                id="team-invitations-heading"
                className="font-tech text-label-readable uppercase text-amber-400"
              >
                Pending Invitations{" "}
                <span className="ml-2 text-muted-foreground">{invitedTeams.length}</span>
              </h2>
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
            </section>
          )}
          {activeTeams.length > 0 && (
            <section aria-labelledby="joined-teams-heading" className="flex flex-col gap-3">
              <h2
                id="joined-teams-heading"
                className="font-tech text-label-readable uppercase text-muted-foreground"
              >
                Your Teams <span className="ml-2 text-muted-foreground">{activeTeams.length}</span>
              </h2>
              <div className="grid auto-rows-fr gap-4">
                {activeTeams.map((team) => (
                  <TeamSummaryCard
                    key={team.id}
                    team={team}
                    isCaptain={team.captainUserId === session.id}
                    championships={championshipsByTeam.get(team.id) ?? []}
                  />
                ))}
              </div>
            </section>
          )}
          {teams.length === 0 && <TeamsEmptyState onCreateTeam={() => setCreateOpen(true)} />}
        </div>
      )}

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        memberId={session.id}
        onCreated={(created) => {
          handleMembershipUpdate();
          navigate({ to: "/teams/$id", params: { id: created.id } });
        }}
      />
    </>
  );
}
