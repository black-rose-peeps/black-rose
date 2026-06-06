import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { TournamentHero } from "@/features/tournaments/$id/components/TournamentHero";
import { TournamentTabs } from "@/features/tournaments/$id/components/TournamentTabs";
import { OverviewTab } from "@/features/tournaments/$id/components/OverviewTab";
import { TeamsTab } from "@/features/tournaments/$id/components/TeamsTab";
import { BracketTab } from "@/features/tournaments/$id/components/BracketTab";
import { RulesTab } from "@/features/tournaments/$id/components/RulesTab";
import { useTournamentRegistrations } from "@/features/tournaments/hooks";
import {
  bracketFieldSize,
  mockTeamToTournamentTeam,
  resolveTournamentRules,
} from "@/features/tournaments/utils";
import { mockTournamentDetails } from "@/lib/mock-tournament-details";
import { fetchTournamentById } from "@/features/tournaments/services";
import { useLiveBracket } from "@/lib/bracket-store";
import type { Tab } from "@/features/tournaments/$id/components/TournamentTabs";
import type { TournamentDetail } from "@/features/tournaments/types";
import type { MockTournament } from "@/lib/mock-data";

function detailFromSummary(summary: MockTournament): TournamentDetail {
  return {
    id: summary.id,
    name: summary.name,
    game: summary.game,
    status: summary.status as TournamentDetail["status"],
    prizePool: summary.prizePool,
    startDate: summary.startDate,
    registrationDeadline: summary.registrationDeadline,
    teamsRegistered: summary.teamsRegistered,
    teamCap: summary.teamCap,
    format: summary.format,
    region: summary.region,
    description: `${summary.name} is a Black Rose community tournament. Full details coming soon.`,
    organizer: "Black Rose Operations",
    contact: "ops@blackrose.gg",
    prizeBreakdown: [{ place: "1st Place", prize: summary.prizePool }],
    schedule: [
      { phase: "Registration Deadline", date: summary.registrationDeadline },
      { phase: "Tournament Starts", date: summary.startDate },
    ],
    rules: [],
    bracket: [],
    teams: [],
  };
}

export const Route = createFileRoute("/tournaments/$id")({
  loader: async ({ params }): Promise<{ tournament: TournamentDetail }> => {
    // Try the rich detail record first (has description, rules, schedule, bracket)
    const detail = mockTournamentDetails[params.id];
    if (detail) return { tournament: detail };

    // SSR guard — supabase-js throws on Node < 22 without native WebSocket.
    // Fall back to a minimal stub; the component fetches the real data client-side.
    if (typeof window === "undefined") {
      const stub: TournamentDetail = {
        id: params.id,
        name: "Loading…",
        game: "Valorant",
        status: "Draft" as TournamentDetail["status"],
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
      { title: `${loaderData?.tournament?.name ?? "Tournament"} — Black Rose` },
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
    if (mockTournamentDetails[id]) return;
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

  // Live registrations — the admin service is the single source of truth.
  // We show only Approved teams (filtered inside the hook).
  const { registrations, isLoading: teamsLoading } = useTournamentRegistrations(tournament.id);

  // Convert approved registrations → TournamentTeam for the public TeamsTab.
  // Fall back to the static detail teams if live registrations haven't loaded yet.
  const liveTeams = registrations.map(mockTeamToTournamentTeam);
  const displayTeams = liveTeams.length > 0 ? liveTeams : tournament.teams;

  // Bracket: subscribe to the live bracket store so the public page re-renders
  // whenever the admin publishes, updates scores/winners, or resets.
  // Falls back to the static mockTournamentDetails bracket when not yet published.
  const { bracket: liveBracket, isLoading: bracketLoading } = useLiveBracket(tournament.id);
  const displayBracket = liveBracket ?? tournament.bracket;

  // teamsRegistered shown in the hero: prefer live count once loaded
  const liveDetail: TournamentDetail = {
    ...tournament,
    teamsRegistered: teamsLoading ? tournament.teamsRegistered : registrations.length,
  };

  const approvedCount =
    displayTeams.length > 0 ? displayTeams.length : tournament.teamsRegistered;
  const rulesBracketSize = bracketFieldSize(approvedCount) ?? tournament.teamCap;

  const displayRules = resolveTournamentRules(tournament.format, tournament.rules, {
    game: tournament.game,
    teamCap: rulesBracketSize,
  });

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
              <OverviewTab tournament={liveDetail} />
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
