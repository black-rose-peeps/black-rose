import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  UserPlus,
  Trophy,
  ChevronRight,
  Search,
  X,
  Crown,
  Loader2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchTeamById,
  inviteMemberToTeam,
  removeMemberFromTeam,
} from "@/features/admin/features/teams/services/teams.service";
import {
  searchVerifiedMembersForInvite,
  type InviteSearchMember,
} from "@/features/admin/features/members/services/members.service";
import { MemberPageLayout, TechPanel } from "@/features/member/components/MemberShell";
import { getSession } from "@/features/auth/store/session";
import { EditTeamDialog } from "@/features/teams/components/EditTeamDialog";
import { InviteMemberSearchSkeleton } from "@/features/teams/components/InviteMemberSearchSkeleton";
import { RosterTable } from "@/features/teams/components/RosterTable";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
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
  const [inviteSearch, setInviteSearch] = useState("");
  const [invitePage, setInvitePage] = useState(1);
  const [inviteTotal, setInviteTotal] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<InviteSearchMember[]>([]);
  const [searching, setSearching] = useState(false);
  const invitePageSize = 8;
  const [actionError, setActionError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const loadTeam = useCallback(async (options?: { showLoader?: boolean }) => {
    const showLoader = options?.showLoader ?? false;
    if (showLoader) setLoading(true);
    setNotFound(false);
    try {
      const data = await fetchTeamById(id);
      if (!data) {
        setNotFound(true);
        setTeam(null);
      } else {
        setTeam(data);
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id]);

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

  useEffect(() => {
    setInvitePage(1);
  }, [inviteSearch]);

  useEffect(() => {
    if (!team || !inviteOpen) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      const excludeIds = team.members.map((m) => m.userId);
      searchVerifiedMembersForInvite(inviteSearch, excludeIds, {
        page: invitePage,
        pageSize: invitePageSize,
      })
        .then((result) => {
          if (!cancelled) {
            setSearchResults(result.members);
            setInviteTotal(result.total);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResults([]);
            setInviteTotal(0);
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inviteSearch, inviteOpen, team, invitePage, invitePageSize]);

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

  if (notFound || !team) {
    return (
      <MemberPageLayout maxWidth="max-w-5xl">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="font-display text-5xl tracking-display">404</p>
          <p className="text-muted-foreground">Team not found.</p>
          <Button asChild variant="outline" className="rounded-none font-tech text-[10px] uppercase tracking-wider-2">
            <Link to="/teams">Back to Teams</Link>
          </Button>
        </div>
      </MemberPageLayout>
    );
  }

  const isCaptain = team.captainUserId === session.id;
  const isMember = team.members.some((m) => m.userId === session.id && m.status !== "removed");

  if (!isMember) {
    return (
      <MemberPageLayout maxWidth="max-w-5xl">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">You are not a member of this team.</p>
          <Button asChild variant="outline" className="rounded-none font-tech text-[10px] uppercase tracking-wider-2">
            <Link to="/teams">Back to Teams</Link>
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
  const inviteTotalPages = Math.max(1, Math.ceil(inviteTotal / invitePageSize));
  const inviteRangeStart = inviteTotal === 0 ? 0 : (invitePage - 1) * invitePageSize + 1;
  const inviteRangeEnd = Math.min(invitePage * invitePageSize, inviteTotal);

  async function handleRemove(member: TeamMember) {
    setActionError(null);
    try {
      const updated = await removeMemberFromTeam(team!.id, member.userId);
      setTeam(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  }

  async function handleInvite(memberId: string) {
    setActionError(null);
    setInvitingId(memberId);
    try {
      const updated = await inviteMemberToTeam({ teamId: team!.id, memberId });
      setTeam(updated);
      setInviteSearch("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to invite member.");
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <MemberPageLayout maxWidth="max-w-5xl">
      <Button
        asChild
        variant="ghost"
        className="mb-6 -ml-2 rounded-none font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        <Link to="/teams">
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

          {isCaptain && (
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
                  onClick={() => setInviteOpen((v) => !v)}
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

      {actionError && (
        <p className="mb-4 text-sm text-red-400">{actionError}</p>
      )}

      {inviteOpen && isCaptain && (
        <TechPanel
          label="Invite"
          title="Add a Member"
          icon={<UserPlus className="h-3.5 w-3.5" />}
          action={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setInviteOpen(false);
                setInviteSearch("");
                setInvitePage(1);
              }}
              className="h-8 w-8 rounded-none"
            >
              <X className="h-4 w-4" />
            </Button>
          }
          className="mb-6"
        >
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search verified members…"
              value={inviteSearch}
              onChange={(e) => setInviteSearch(e.target.value)}
              className="h-10 border-white/12 bg-white/[0.03] pl-9 rounded-none"
            />
          </div>

          {searching ? (
            <InviteMemberSearchSkeleton />
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {inviteSearch ? "No members found." : "No verified members available to invite."}
            </p>
          ) : (
            <>
              <ul className="divide-y divide-white/6">
                {searchResults.map((m) => {
                  const alreadyInvited = team.members.some(
                    (tm) => tm.userId === m.id && tm.status === "invited",
                  );
                  return (
                    <li key={m.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center border border-white/10 bg-white/5 font-display text-xs tracking-display">
                          {m.avatarInitials}
                        </div>
                        <span className="text-sm font-medium">{m.displayName}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={alreadyInvited || invitingId === m.id}
                        variant={alreadyInvited ? "outline" : "secondary"}
                        onClick={() => handleInvite(m.id)}
                        className="rounded-none font-tech text-[10px] uppercase tracking-wider-2"
                      >
                        {invitingId === m.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : alreadyInvited ? (
                          "Invited"
                        ) : (
                          "Invite"
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <AdminTablePagination
                page={invitePage}
                totalPages={inviteTotalPages}
                total={inviteTotal}
                rangeStart={inviteRangeStart}
                rangeEnd={inviteRangeEnd}
                onPageChange={setInvitePage}
                className="border-white/6 px-0"
              />
            </>
          )}

          <p className="mt-4 text-[10px] text-muted-foreground/50">
            Invites are stored on the roster as pending. (
            {MAX_TEAM_SIZE - team.members.filter((m) => m.status !== "removed").length} slots
            remaining)
          </p>
        </TechPanel>
      )}

      <TechPanel
        label="Roster"
        title={`Members · ${team.members.filter((m) => m.status !== "removed").length} / ${MAX_TEAM_SIZE}`}
        noPadding
      >
        <RosterTable
          team={team}
          currentUserId={session.id}
          isEditable={isCaptain}
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

      {isCaptain && (
        <EditTeamDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          team={team}
          onUpdated={setTeam}
        />
      )}
    </MemberPageLayout>
  );
}
