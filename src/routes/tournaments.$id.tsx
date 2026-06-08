import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { TournamentHero } from "@/features/tournaments/$id/components/TournamentHero";
import { TournamentDetailSkeleton } from "@/features/tournaments/$id/components/TournamentDetailSkeleton";
import { TournamentTabs } from "@/features/tournaments/$id/components/TournamentTabs";
import { OverviewTab } from "@/features/tournaments/$id/components/OverviewTab";
import { TeamsTab } from "@/features/tournaments/$id/components/TeamsTab";
import { BracketTab } from "@/features/tournaments/$id/components/BracketTab";
import { RulesTab } from "@/features/tournaments/$id/components/RulesTab";
import { useTournamentRegistrations } from "@/features/tournaments/hooks";
import {
  bracketFieldSize,
  buildTeamTagMap,
  mockTeamToTournamentTeam,
  resolveTournamentRules,
  toPublicTournamentStatus,
} from "@/features/tournaments/utils";
import { buildTournamentSchedule } from "@/features/tournaments/utils/tournament-schedule";
import { fetchTournamentById } from "@/features/tournaments/services";
import {
  buildPodiumPlacements,
  DEFAULT_PRIZE_TIERS,
  derivePublicPlacements,
} from "@/features/tournaments/utils/tournament-placements";
import { useLiveBracket } from "@/lib/bracket-store";
import { getSupabaseClient } from "@/lib/supabase";
import type { Tab } from "@/features/tournaments/$id/components/TournamentTabs";
import type { BracketRound, TournamentDetail } from "@/features/tournaments/types";
import type { MockTournament } from "@/lib/mock-data";

function detailFromSummary(summary: MockTournament, bracketRounds: BracketRound[] = []): TournamentDetail {
  const status = toPublicTournamentStatus(summary.status);
  return {
    id: summary.id,
    name: summary.name,
    game: summary.game,
    status,
    prizePool: summary.prizePool,
    startDate: summary.startDate,
    registrationDeadline: summary.registrationDeadline,
    teamsRegistered: summary.teamsRegistered,
    teamCap: summary.teamCap,
    format: summary.format,
    region: summary.region,
    participationType: summary.participationType,
    wwmMode: summary.wwmMode,
    description: `${summary.name} is a Black Rose community tournament. Follow the bracket and overview for live updates.`,
    organizer: "Black Rose Operations",
    contact: "ops@blackrose.gg",
    prizeBreakdown:
      summary.prizeBreakdown?.length ? summary.prizeBreakdown : DEFAULT_PRIZE_TIERS,
    schedule: buildTournamentSchedule({
      registrationDeadline: summary.registrationDeadline,
      startDate: summary.startDate,
      format: summary.format,
      status,
      bracketRounds,
    }),
    rules: [],
    bracket: bracketRounds,
    teams: [],
    placements: [],
  };
}

function tournamentPageTitle(name: string | undefined): string {
  const label = name && name !== "Loading…" ? name : "Tournament";
  return `${label} — Black Rose`;
}

export const Route = createFileRoute("/tournaments/$id")({
  loader: async ({ params }): Promise<{ tournament: TournamentDetail }> => {
    // SSR guard — supabase-js throws on Node < 22 without native WebSocket.
    // Fall back to a minimal stub; the component fetches the real data client-side.
    if (typeof window === "undefined") {
      const stub: TournamentDetail = {
        id: params.id,
        name: "Loading…",
        game: "Valorant",
        status: "Registration Closed",
        prizePool: "",
        startDate: "",
        registrationDeadline: "",
        teamsRegistered: 0,
        teamCap: 0,
        format: "",
        region: "",
        description: "",
        organizer: "",
        contact: "",
        prizeBreakdown: [],
        schedule: [],
        rules: [],
        bracket: [],
        teams: [],
      };
      return { tournament: stub };
    }

    // Fall back to the live service for tournaments without a detail record
    const summary = await fetchTournamentById(params.id);
    if (!summary || summary.status === "Draft") throw notFound();

    return { tournament: detailFromSummary(summary) };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: tournamentPageTitle(loaderData?.tournament?.name) },
      {
        name: "description",
        content: loaderData?.tournament?.description ?? "Tournament details on Black Rose Arena.",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p className="font-display text-5xl tracking-display">404</p>
      <p className="text-muted-foreground">Tournament not found.</p>
    </div>
  ),
  component: TournamentDetailPage,
});

function TournamentDetailPage() {
  const { tournament: loaderTournament } = Route.useLoaderData()!;
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(loaderTournament);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Replace SSR stub with a client fetch (Supabase is browser-only in this app).
  useEffect(() => {
    if (tournament.name !== "Loading…") return;

    let cancelled = false;
    fetchTournamentById(id)
      .then((summary) => {
        if (cancelled) return;
        if (!summary || summary.status === "Draft") {
          navigate({ to: "/tournaments" });
          return;
        }
        setTournament(detailFromSummary(summary));
      })
      .catch((err) => {
        console.error("[tournaments/$id] Client fetch failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate, tournament.name]);

  useEffect(() => {
    if (tournament.name === "Loading…") return;
    document.title = tournamentPageTitle(tournament.name);
  }, [tournament.name]);

  // Live registrations — the admin service is the single source of truth.
  // We show only Approved teams (filtered inside the hook).
  const { registrations, isLoading: teamsLoading } = useTournamentRegistrations(tournament.id);

  // Convert approved registrations → TournamentTeam for the public TeamsTab.
  // Fall back to the static detail teams if live registrations haven't loaded yet.
  const liveTeams = registrations.map(mockTeamToTournamentTeam);
  const displayTeams = liveTeams.length > 0 ? liveTeams : tournament.teams;
  const teamTagMap = useMemo(() => buildTeamTagMap(displayTeams), [displayTeams]);

  // Bracket: subscribe to the live bracket store so the public page re-renders
  // whenever the admin publishes, updates scores/winners, or resets.
  const {
    bracket: liveBracket,
    prizeBreakdown: livePrizeBreakdown,
    isLoading: bracketLoading,
  } = useLiveBracket(tournament.id);
  const displayBracket = liveBracket ?? tournament.bracket;

  // Keep status, prize breakdown, and metadata in sync when admin updates the tournament.
  useEffect(() => {
    let cancelled = false;

    function applySummary(summary: MockTournament) {
      if (cancelled || summary.status === "Draft") return;
      setTournament((prev) => ({
        ...detailFromSummary(summary, liveBracket ?? prev.bracket),
        teams: prev.teams,
        rules: prev.rules,
      }));
    }

    fetchTournamentById(id)
      .then((summary) => {
        if (!summary) return;
        applySummary(summary);
      })
      .catch((err) => {
        console.error("[tournaments/$id] Summary refresh failed:", err);
      });

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`tournament-summary:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${id}`,
        },
        () => {
          fetchTournamentById(id)
            .then((summary) => {
              if (summary) applySummary(summary);
            })
            .catch((err) => {
              console.error("[tournaments/$id] Realtime summary refresh failed:", err);
            });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [id, liveBracket]);

  const resolvedPrizeBreakdown = useMemo(() => {
    if (tournament.prizeBreakdown.length) return tournament.prizeBreakdown;
    if (livePrizeBreakdown?.length) return livePrizeBreakdown;
    return DEFAULT_PRIZE_TIERS;
  }, [tournament.prizeBreakdown, livePrizeBreakdown]);

  const displayPlacements = useMemo(() => {
    const isDone = tournament.status === "Completed" || tournament.status === "Archived";
    if (!isDone || !displayBracket.length) return [];

    const raw = derivePublicPlacements(tournament.format, displayBracket);
    return buildPodiumPlacements(resolvedPrizeBreakdown, raw);
  }, [tournament.status, tournament.format, displayBracket, resolvedPrizeBreakdown]);

  const liveDetail: TournamentDetail = {
    ...tournament,
    teamsRegistered: teamsLoading ? tournament.teamsRegistered : registrations.length,
    prizeBreakdown: resolvedPrizeBreakdown,
    schedule: buildTournamentSchedule({
      registrationDeadline: tournament.registrationDeadline,
      startDate: tournament.startDate,
      format: tournament.format,
      status: tournament.status,
      bracketRounds: displayBracket,
    }),
    placements: displayPlacements,
  };

  const approvedCount =
    displayTeams.length > 0 ? displayTeams.length : tournament.teamsRegistered;
  const rulesBracketSize = bracketFieldSize(approvedCount) ?? tournament.teamCap;

  const displayRules = resolveTournamentRules(tournament.format, tournament.rules, {
    game: tournament.game,
    teamCap: rulesBracketSize,
    participationType: liveDetail.participationType,
    wwmMode: liveDetail.wwmMode,
  });

  const isLoadingDetail = tournament.name === "Loading…";

  if (isLoadingDetail) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <TournamentDetailSkeleton />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <TournamentHero tournament={liveDetail} />

      <TournamentTabs active={activeTab} onChange={setActiveTab} teamCount={displayTeams.length} />

      <main className="relative bg-[oklch(0.05_0_0)]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        <div className="relative mx-auto max-w-7xl px-6 py-12">
          {activeTab === "overview" && (
            <div role="tabpanel" id="tab-panel-overview" aria-labelledby="tab-overview">
              <OverviewTab
                tournament={{ ...liveDetail, bracket: displayBracket }}
                teamTags={teamTagMap}
              />
            </div>
          )}
          {activeTab === "teams" && (
            <div role="tabpanel" id="tab-panel-teams" aria-labelledby="tab-teams">
              <TeamsTab teams={displayTeams} isLoading={teamsLoading} />
            </div>
          )}
          {activeTab === "bracket" && (
            <div role="tabpanel" id="tab-panel-bracket" aria-labelledby="tab-bracket">
              <BracketTab
                bracket={displayBracket}
                format={tournament.format}
                isLoading={bracketLoading}
                teamTags={teamTagMap}
                tournamentStatus={liveDetail.status}
              />
            </div>
          )}
          {activeTab === "rules" && (
            <div role="tabpanel" id="tab-panel-rules" aria-labelledby="tab-rules">
              <RulesTab
                rules={displayRules}
                format={tournament.format}
                contact={tournament.contact}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
