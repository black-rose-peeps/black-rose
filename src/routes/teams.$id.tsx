import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Trophy, ChevronRight, Crown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  acceptTeamInvite,
  declineTeamInvite,
  fetchTeamById,
  removeMemberFromTeam,
  updateTeamMemberRole,
} from "@/features/admin/features/teams/services/teams.service";
import { syncTeamMembershipNotifications } from "@/features/notifications/services/team-membership-notifications";
import { markTeamInviteRead } from "@/features/notifications/store";
import { MemberPageLayout, TechPanel } from "@/features/member/components/MemberShell";
import { getSession } from "@/features/auth/store/session";
import { EditTeamDialog } from "@/features/teams/components/EditTeamDialog";
import { InviteMemberDialog } from "@/features/teams/components/InviteMemberDialog";
import { TeamInviteBanner } from "@/features/teams/components/TeamInviteBanner";
import { useTeamMembersRealtime } from "@/features/teams/hooks/useTeamMembersRealtime";
import { isPendingInvite } from "@/features/teams/utils/membership";
import {
  approvedRegistration,
  fetchRegistrationsForTeam,
  pendingRegistrations,
} from "@/features/tournaments/services/team-registration.service";
import { fetchTeamChampionships } from "@/features/championships/services/championship.service";
import { ChampionMarkGroup } from "@/features/championships/components/ChampionMarkGroup";
import { RoseStarMark } from "@/features/championships/components/RoseStarMark";
import { ChampionshipTitlesCard } from "@/features/championships/components/ChampionshipTitlesCard";
import type { ChampionshipTitle } from "@/features/championships/types";
import { TeamRosterPanel } from "@/features/teams/components/TeamRosterPanel";
import { GAME_COLOR, GAME_ACCENT, MAX_TEAM_SIZE } from "@/features/teams/constants";
import type { Team, TeamMember, TeamMemberRole } from "@/features/teams/types";
import type { MockTeam } from "@/lib/mock-data";

export const Route = createFileRoute("/teams/$id")({
  head: () => ({ meta: [{ title: "Team — Black Rose" }] }),
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const session = getSession();
  const memberId = session?.id;
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [respondingInvite, setRespondingInvite] = useState(false);
  const [registrations, setRegistrations] = useState<MockTeam[]>([]);
  const [championships, setChampionships] = useState<ChampionshipTitle[]>([]);

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
          const isViewerMember = Boolean(
            memberId &&
              data.members.some((m) => m.userId === memberId && m.status !== "removed"),
          );
          const [regsResult, titlesResult] = await Promise.allSettled([
            isViewerMember ? fetchRegistrationsForTeam(data.id) : Promise.resolve([]),
            fetchTeamChampionships(data.id),
          ]);
          if (regsResult.status === "fulfilled") {
            setRegistrations(regsResult.value);
          } else {
            console.warn("[teams] Failed to load registrations:", regsResult.reason);
            setRegistrations([]);
          }
          if (titlesResult.status === "fulfilled") {
            setChampionships(titlesResult.value);
          } else {
            console.warn("[teams] Failed to load championships:", titlesResult.reason);
            setChampionships([]);
          }
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load team.");
        setNotFound(false);
        setTeam(null);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [id, memberId],
  );

  const refreshTeam = useCallback(() => {
    void loadTeam();
  }, [loadTeam]);

  useTeamMembersRealtime(id, refreshTeam);

  useEffect(() => {
    void loadTeam({ showLoader: true });
  }, [loadTeam]);

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
            className="rounded-none font-tech text-ui-readable uppercase"
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
            className="rounded-none font-tech text-ui-readable uppercase"
          >
            <Link to="/teams" search={{ create: false }}>
              Back to Teams
            </Link>
          </Button>
        </div>
      </MemberPageLayout>
    );
  }

  const viewerId = memberId ?? "";
  const isCaptain = Boolean(memberId && team.captainUserId === memberId);
  const isInvited = Boolean(memberId && isPendingInvite(team, memberId));
  const isMember = Boolean(
    memberId && team.members.some((m) => m.userId === memberId && m.status !== "removed"),
  );
  const isPublicView = !isMember;

  const activeCount = team.members.filter(
    (m) => m.status === "captain" || m.status === "active",
  ).length;
  const pendingCount = team.members.filter((m) => m.status === "invited").length;
  const canInvite = team.members.filter((m) => m.status !== "removed").length < MAX_TEAM_SIZE;
  const pendingRegs = pendingRegistrations(registrations);
  const approvedReg = approvedRegistration(registrations);
  const hasBlockingRegistration = Boolean(approvedReg || pendingRegs.length > 0);

  async function handleRemove(member: TeamMember) {
    setActionError(null);
    try {
      const updated = await removeMemberFromTeam(team!.id, member.userId);
      setTeam(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  }

  async function handleRoleChange(member: TeamMember, role: TeamMemberRole) {
    if (!memberId) return;
    setActionError(null);
    try {
      const updated = await updateTeamMemberRole(team!.id, member.userId, role, memberId);
      setTeam(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update role.");
    }
  }

  async function handleAcceptInvite() {
    if (!memberId) return;
    setActionError(null);
    setRespondingInvite(true);
    try {
      const updated = await acceptTeamInvite(team!.id, memberId);
      setTeam(updated);
      markTeamInviteRead(team!.id);
      if (memberId) {
        void syncTeamMembershipNotifications(memberId).catch((err) => {
          console.warn("[teams] Failed to sync membership notifications:", err);
        });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to accept invite.");
    } finally {
      setRespondingInvite(false);
    }
  }

  async function handleDeclineInvite() {
    if (!memberId) return;
    setActionError(null);
    setRespondingInvite(true);
    try {
      await declineTeamInvite(team!.id, memberId);
      markTeamInviteRead(team!.id);
      navigate({ to: "/teams", search: { create: false } });
      if (memberId) {
        void syncTeamMembershipNotifications(memberId).catch((err) => {
          console.warn("[teams] Failed to sync membership notifications:", err);
        });
      }
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
        className="mb-6 -ml-2 rounded-none font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        <Link to={isPublicView ? "/champions" : "/teams"} search={isPublicView ? undefined : { create: false }}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {isPublicView ? "Hall of Champions" : "My Teams"}
        </Link>
      </Button>

      <div className="relative mb-6 overflow-hidden border border-white/8 bg-[oklch(0.07_0_0)] clip-tab">
        <div className={`h-[3px] w-full bg-linear-to-r ${GAME_ACCENT[team.game]}`} />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative grid h-20 w-20 shrink-0 place-items-center border-2 border-white/15 bg-white/5 font-display text-2xl tracking-display">
              {team.tag}
              {championships.length > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center border border-white/15 bg-[oklch(0.07_0_0)] text-white/60"
                  title={championships.map((c) => c.tournamentName).join(" · ")}
                >
                  <RoseStarMark size={11} />
                </span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-3xl tracking-display sm:text-4xl">{team.name}</h1>
                {championships.length > 0 && (
                  <ChampionMarkGroup titles={championships} size="md" showLabel />
                )}
                {isCaptain && <Crown className="h-4 w-4 text-white/40" aria-label="Captain" />}
              </div>
              <span
                className={`font-tech text-label-readable uppercase ${GAME_COLOR[team.game]}`}
              >
                {team.game}
              </span>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{activeCount} active</span>
                {!isPublicView && pendingCount > 0 && (
                  <span className="text-amber-400">{pendingCount} pending invite</span>
                )}
                <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {!isPublicView && isCaptain && !isInvited && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
                className="rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Team
              </Button>
              {approvedReg || team.activeTournamentId ? (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-none border-white/15 font-tech text-ui-readable uppercase"
                >
                  <Link
                    to="/tournaments/$id"
                    params={{ id: approvedReg?.tournamentId ?? team.activeTournamentId! }}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    View Tournament
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : !hasBlockingRegistration ? (
                <Button
                  asChild
                  className="clip-cta inline-flex h-11 items-center rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90"
                >
                  <Link to="/tournaments">
                    <Trophy className="h-3.5 w-3.5" />
                    Register for Tournament
                  </Link>
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {!isPublicView && isInvited && memberId && (
        <TeamInviteBanner
          team={team}
          captainName={team.members.find((m) => m.status === "captain")?.displayName ?? "A captain"}
          responding={respondingInvite}
          onAccept={() => void handleAcceptInvite()}
          onDecline={() => void handleDeclineInvite()}
        />
      )}

      {actionError && <p className="mb-4 text-sm text-red-400">{actionError}</p>}

      {championships.length > 0 && (
        <div className="mb-6">
          <ChampionshipTitlesCard titles={championships} label="Championship Legacy" />
        </div>
      )}

      <TeamRosterPanel
        team={team}
        currentUserId={viewerId}
        variant={isPublicView ? "public" : "manage"}
        isEditable={!isPublicView && isCaptain && !isInvited}
        canInvite={canInvite}
        onInvite={() => setInviteOpen(true)}
        onRemove={handleRemove}
        onRoleChange={
          !isPublicView && isMember && !isInvited ? handleRoleChange : undefined
        }
      />

      {!isPublicView && pendingRegs.length > 0 && (
        <TechPanel
          label="Tournament"
          title="Pending Registration"
          icon={<Trophy className="h-3.5 w-3.5" />}
          className="mt-6"
        >
          <ul className="space-y-3">
            {pendingRegs.map((registration) => (
              <li key={registration.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Awaiting admin approval</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Submitted {registration.registrationDate}
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-none border-white/15 font-tech text-ui-readable uppercase"
                >
                  <Link to="/tournaments/$id" params={{ id: registration.tournamentId }}>
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </TechPanel>
      )}

      {!isPublicView && approvedReg && (
        <TechPanel
          label="Tournament"
          title="Active Registration"
          icon={<Trophy className="h-3.5 w-3.5" />}
          className="mt-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">
                {team.activeTournamentName ?? "Registered tournament"}
              </p>
              <p className="mt-0.5 text-xs text-emerald-400">Approved — your team is registered</p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-none border-white/15 font-tech text-ui-readable uppercase"
            >
              <Link to="/tournaments/$id" params={{ id: approvedReg.tournamentId }}>
                View <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </TechPanel>
      )}

      {!isPublicView && isCaptain && !isInvited && (
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
