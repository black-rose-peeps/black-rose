import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { createDebouncedRefetch } from "@/lib/debounce-refetch";
import {
  fetchActiveMemberTeamsCached,
  fetchTournamentsLiteCached,
  loadMemberTournamentNotificationContext,
} from "@/features/member/queries/member-data-queries";
import { queryKeys } from "@/lib/query-keys";
import { setNotificationMemberId } from "../store";
import { syncTeamMembershipNotifications } from "../services/team-membership-notifications";
import { syncGameMembershipNotifications } from "../services/game-membership-notifications";
import { syncProfileCommentNotifications } from "../services/profile-comment-notifications";
import { syncTournamentRegistrationRequestNotifications } from "../services/tournament-registration-request-notifications";
import { syncTournamentRegistrationNotifications } from "../services/tournament-registration-notifications";
import { syncTournamentLiveNotifications } from "../services/tournament-live-notifications";
type Category = "membership" | "game-memberships" | "tournaments" | "comments";
const ALL_CATEGORIES: Category[] = ["membership", "game-memberships", "tournaments", "comments"];

function teamIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/** Realtime where public policies permit it, with a trusted polling feed for private approvals. */
export function useNotificationSync(memberId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    setNotificationMemberId(memberId ?? null);
    if (!memberId) return;

    const userId = memberId;
    let cancelled = false;
    let running: Promise<void> | null = null;
    const pending = new Set<Category>();
    const dirty = new Set<Category>();
    const supabase = getSupabaseClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let subscribedTeamIds: string[] = [];

    // A pre-change response must not clear the invalidation and become fresh again.
    const invalidate = async (
      queryKey: readonly unknown[],
      refetchType: "none" | "active" = "none",
    ) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey, refetchType });
    };

    async function syncAll() {
      if (running) return running;
      running = (async () => {
        while (!cancelled && pending.size) {
          const categories = new Set(pending);
          const changed = new Set(dirty);
          pending.clear();
          dirty.clear();
          try {
            const invalidations: Promise<void>[] = [];
            if (changed.has("membership")) {
              invalidations.push(invalidate(queryKeys.memberTeams(userId)));
              invalidations.push(invalidate(queryKeys.memberProfile(userId), "active"));
            }
            if (changed.has("tournaments")) {
              invalidations.push(invalidate(queryKeys.tournamentsLite()));
            }
            if (changed.has("membership") || changed.has("tournaments")) {
              invalidations.push(invalidate(queryKeys.memberDashboard(userId), "active"));
              invalidations.push(invalidate(queryKeys.memberChampionships(userId), "active"));
              for (const teamId of subscribedTeamIds) {
                invalidations.push(invalidate(queryKeys.teamRegistrations(teamId)));
              }
            }
            await Promise.all(invalidations);
            if (cancelled) return;
            const work: Promise<unknown>[] = [];
            if (categories.has("membership")) work.push(syncTeamMembershipNotifications(userId));
            if (categories.has("game-memberships")) {
              work.push(
                syncGameMembershipNotifications(userId)
                  .then(async (result) => {
                    if (!cancelled && result.hasNewAcceptance) {
                      await invalidate(["my-game-workspace", userId], "active");
                    }
                  })
                  .catch((error: unknown) => {
                    if (!cancelled)
                      console.warn("[notifications] Game approval feed unavailable:", error);
                  }),
              );
            }
            if (categories.has("comments")) work.push(syncProfileCommentNotifications(userId));
            if (categories.has("tournaments") || categories.has("membership")) {
              work.push(
                (async () => {
                  const tournaments = await fetchTournamentsLiteCached();
                  const context = await loadMemberTournamentNotificationContext(userId, {
                    tournaments,
                  });
                  if (cancelled) return;
                  await Promise.all([
                    syncTournamentRegistrationNotifications(userId, context),
                    syncTournamentRegistrationRequestNotifications(userId, context.tournaments),
                    syncTournamentLiveNotifications(userId, context),
                  ]);
                })(),
              );
            }
            await Promise.all(work);
            if (categories.has("membership")) await refreshSubscriptionIfTeamsChanged();
          } catch (err) {
            if (!cancelled) console.error("[notifications] sync failed:", err);
          }
        }
      })().finally(() => {
        running = null;
      });
      return running;
    }

    const debouncedSyncAll = createDebouncedRefetch(syncAll, 3000);
    function schedule(categories: Category[], changed = true) {
      for (const category of categories) {
        pending.add(category);
        if (changed) dirty.add(category);
      }
      debouncedSyncAll();
    }

    async function teardownChannel() {
      if (!channel) return;
      await supabase.removeChannel(channel);
      channel = null;
    }

    async function refreshSubscriptionIfTeamsChanged() {
      if (cancelled) return;
      try {
        const teams = await fetchActiveMemberTeamsCached(userId);
        const teamIds = teams.map((team) => team.id);
        if (!channel || !teamIdsEqual(subscribedTeamIds, teamIds)) {
          await subscribe(teamIds);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[notifications] Failed to refresh registration filter:", err);
        }
      }
    }

    async function subscribe(existingTeamIds?: string[]) {
      await teardownChannel();

      let teamIds: string[] = [];
      try {
        teamIds =
          existingTeamIds ?? (await fetchActiveMemberTeamsCached(userId)).map((team) => team.id);
      } catch (err) {
        if (!cancelled) {
          console.warn("[notifications] Failed to load teams for registration filter:", err);
        }
      }

      if (cancelled) return;

      subscribedTeamIds = teamIds;

      let nextChannel = supabase.channel(`member-notifications:${userId}`).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          schedule(["membership"]);
        },
      );

      if (teamIds.length > 0) {
        nextChannel = nextChannel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "teams",
              filter: `id=in.(${teamIds.join(",")})`,
            },
            () => schedule(["membership"]),
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "team_members",
              filter: `team_id=in.(${teamIds.join(",")})`,
            },
            () => schedule(["membership"]),
          );
        nextChannel = nextChannel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tournament_registrations",
            filter: `roster_team_id=in.(${teamIds.join(",")})`,
          },
          () => {
            schedule(["tournaments"]);
          },
        );
      }

      nextChannel = nextChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profile_comments",
          filter: `profile_member_id=eq.${userId}`,
        },
        () => {
          schedule(["comments"]);
        },
      );

      nextChannel = nextChannel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        () => schedule(["tournaments"]),
      );
      channel = nextChannel.subscribe();
    }

    ALL_CATEGORIES.forEach((category) => pending.add(category));
    void syncAll();
    void subscribe();

    function handleFocus() {
      schedule(ALL_CATEGORIES, false);
    }

    window.addEventListener("focus", handleFocus);
    // Audit events are private: do not open browser RLS or depend on an unauthorised
    // Realtime subscription. Refresh only this bounded feed while the tab is visible.
    const approvalPoll = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      schedule(["game-memberships"], false);
    }, 60_000);

    return () => {
      cancelled = true;
      debouncedSyncAll.cancel();
      window.clearInterval(approvalPoll);
      window.removeEventListener("focus", handleFocus);
      void teardownChannel();
      setNotificationMemberId(null);
    };
  }, [memberId, queryClient]);
}
