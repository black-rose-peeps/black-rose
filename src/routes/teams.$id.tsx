import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, UserPlus, Trophy, ChevronRight, Crown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  acceptTeamInvite,
  declineTeamInvite,
  fetchTeamById,
  removeMemberFromTeam,
} from "@/features/admin/features/teams/services/teams.service";
import { syncTeamInviteNotifications } from "@/features/notifications/services/team-invite-notifications";
import { markTeamInviteRead } from "@/features/notifications/store";
import { MemberPageLayout, TechPanel } from "@/features/member/components/MemberShell";
import { getSession } from "@/features/auth/store/session";
import { EditTeamDialog } from "@/features/teams/components/EditTeamDialog";
import { InviteMemberDialog } from "@/features/teams/components/InviteMemberDialog";
import { TeamInviteBanner } from "@/features/teams/components/TeamInviteBanner";
import { useTeamMembersRealtime } from "@/features/teams/hooks/useTeamMembersRealtime";
import { isPendingInvite } from "@/features/teams/utils/membership";
import { RosterTable } from "@/features/teams/components/RosterTable";
import { GAME_COLOR, GAME_ACCENT, MAX_TEAM_SIZE } from "@/features/teams/constants";
import type { Team, TeamMember } from "@/features/teams/types";

export const Route = createFileRoute("/teams/$id")({
  head: () => ({ meta: [{ title: "Team — Black Rose" }] }),
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const session = getSession();
  const memberId = session?.id;
  const memberRole = session?.role;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [respondingInvite, setRespondingInvite] = useState(false);

  const loadTeam = useCallback(
    async (options?: { showLoader?: boolean }) => {
      const showLoader = options?.showLoader ?? false;
      if (showLoader) setLoading(true);
      setNotFound(false);
      setLoadError(null);
      try {
        const data = await fetchTeamById(id);
        if (!data) {
          setNotFound(true);
          setTeam(null);
        } else {
          setTeam(data);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load team.");
        setNotFound(false);
        setTeam(null);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [id],
  );

  const refreshTeam = useCallback(() => {
    void loadTeam();
  }, [loadTeam]);

  useTeamMembersRealtime(id, refreshTeam);

  useEffect(() => {
    if (!memberId) {
      navigate({ to: "/login" });
      return;
    }
    if (memberRole === "not_verified") {
      navigate({ to: "/waitlist" });
      return;
    }
    void loadTeam({ showLoader: true });
  }, [loadTeam, navigate, memberId, memberRole]);

  if (!session) return null;

  if (loading) {
    return (
      <MemberPageLayout maxWidth="max-w-5xl">
        <Skeleton className="mb-6 h-4 w-24 rounded-none bg-white/5" />
        <Skeleton className="mb-6 h-44 w-full rounded-none bg-white/5" />
        <Skeleton className="h-72 w-full rounded-none bg-white/5" />
      </MemberPageLayout>
    );
  }

  if (loadError) {
    return (
      <MemberPageLayout maxWidth="max-w-5xl">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="font-display text-2xl tracking-display">Could not load team</p>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button
            asChild
            variant="outline"
            className="rounded-none font-tech text-[10px] uppercase tracking-wider-2"
          >
            <Link to="/teams" search={{ create: false }}>
              Back to Teams
            </Link>
          </Button>
        </div>
      </MemberPageLayout>
    );
  }

  if (notFound || !team) {
    return (
      <MemberPageLayout maxWidth="max-w-5xl">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="font-display text-5xl tracking-display">404</p>
          <p className="text-muted-foreground">Team not found.</p>
          <Button
            asChild
            variant="outline"
            className="rounded-none font-tech text-[10px] uppercase tracking-wider-2"
          >
            <Link to="/teams" search={{ create: false }}>
              Back to Teams
            </Link>
          </Button>
        </div>
      </MemberPageLayout>
    );
  }

  const isCaptain = team.captainUserId === session.id;
  const isInvited = isPendingInvite(team, session.id);
  const isMember = team.members.some((m) => m.userId === session.id && m.status !== "removed");

  if (!isMember) {
    return (
      <MemberPageLayout maxWidth="max-w-5xl">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">You are not a member of this team.</p>
          <Button
            asChild
            variant="outline"
            className="rounded-none font-tech text-[10px] uppercase tracking-wider-2"
          >
            <Link to="/teams" search={{ create: false }}>
              Back to Teams
            </Link>
          </Button>
        </div>
      </MemberPageLayout>
    );
  }

  const activeCount = team.members.filter(
    (m) => m.status === "captain" || m.status === "active",
  ).length;
  const pendingCount = team.members.filter((m) => m.status === "invited").length;
  const canInvite = team.members.filter((m) => m.status !== "removed").length < MAX_TEAM_SIZE;

  async function handleRemove(member: TeamMember) {
    setActionError(null);
    try {
      const updated = await removeMemberFromTeam(team!.id, member.userId);
      setTeam(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  }

  async function handleAcceptInvite() {
    setActionError(null);
    setRespondingInvite(true);
    try {
      const updated = await acceptTeamInvite(team!.id, memberId!);
      setTeam(updated);
      markTeamInviteRead(team!.id);
      if (memberId) await syncTeamInviteNotifications(memberId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to accept invite.");
    } finally {
      setRespondingInvite(false);
    }
  }

  async function handleDeclineInvite() {
    setActionError(null);
    setRespondingInvite(true);
    try {
      await declineTeamInvite(team!.id, memberId!);
      markTeamInviteRead(team!.id);
      if (memberId) await syncTeamInviteNotifications(memberId);
      navigate({ to: "/teams", search: { create: false } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to decline invite.");
    } finally {
      setRespondingInvite(false);
    }
  }

  return (
    <MemberPageLayout maxWidth="max-w-5xl">
      <Button
        asChild
        variant="ghost"
        className="mb-6 -ml-2 rounded-none font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        <Link to="/teams" search={{ create: false }}>
          <ArrowLeft className="h-3.5 w-3.5" />
          My Teams
        </Link>
      </Button>

      <div className="relative mb-6 overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)] clip-tab">
        <div className={`h-[3px] w-full bg-linear-to-r ${GAME_ACCENT[team.game]}`} />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center border-2 border-white/15 bg-white/5 font-display text-2xl tracking-display">
              {team.tag}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-3xl tracking-display sm:text-4xl">{team.name}</h1>
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

          {isCaptain && !isInvited && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
                className="rounded-none border-white/15 bg-white/5 font-tech text-[10px] uppercase tracking-wider-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Team
              </Button>
              {canInvite && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteOpen(true)}
                  className="rounded-none border-white/15 bg-white/5 font-tech text-[10px] uppercase tracking-wider-2"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Member
                </Button>
              )}
              {team.activeTournamentId ? (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
                >
                  <Link to="/tournaments/$id" params={{ id: team.activeTournamentId }}>
                    <Trophy className="h-3.5 w-3.5" />
                    View Tournament
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="clip-cta rounded-none bg-white font-tech text-[10px] uppercase tracking-wider-2 text-black hover:bg-white/90"
                >
                  <Link to="/tournaments">
                    <Trophy className="h-3.5 w-3.5" />
                    Register for Tournament
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {isInvited && (
        <TeamInviteBanner
          team={team}
          captainName={team.members.find((m) => m.status === "captain")?.displayName ?? "A captain"}
          responding={respondingInvite}
          onAccept={() => void handleAcceptInvite()}
          onDecline={() => void handleDeclineInvite()}
        />
      )}

      {actionError && <p className="mb-4 text-sm text-red-400">{actionError}</p>}

      <TechPanel
        label="Roster"
        title={`Members · ${team.members.filter((m) => m.status !== "removed").length} / ${MAX_TEAM_SIZE}`}
        noPadding
      >
        <RosterTable
          team={team}
          currentUserId={session.id}
          isEditable={isCaptain && !isInvited}
          onRemove={handleRemove}
        />
      </TechPanel>

      {team.activeTournamentId && (
        <TechPanel
          label="Tournament"
          title="Active Registration"
          icon={<Trophy className="h-3.5 w-3.5" />}
          className="mt-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{team.activeTournamentName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Registration pending admin approval
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-none border-white/15 font-tech text-[10px] uppercase tracking-wider-2"
            >
              <Link to="/tournaments/$id" params={{ id: team.activeTournamentId }}>
                View <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </TechPanel>
      )}

      {isCaptain && !isInvited && (
        <>
          <InviteMemberDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            team={team}
            onInvited={setTeam}
          />
          <EditTeamDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            team={team}
            onUpdated={setTeam}
          />
        </>
      )}
    </MemberPageLayout>
  );
}
