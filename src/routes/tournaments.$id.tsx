import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { TournamentHero } from "@/features/tournaments/$id/components/TournamentHero";
import { TournamentTabs } from "@/features/tournaments/$id/components/TournamentTabs";
import { OverviewTab } from "@/features/tournaments/$id/components/OverviewTab";
import { TeamsTab } from "@/features/tournaments/$id/components/TeamsTab";
import { BracketTab } from "@/features/tournaments/$id/components/BracketTab";
import { RulesTab } from "@/features/tournaments/$id/components/RulesTab";
import { mockTournamentDetails } from "@/lib/mock-tournament-details";
import { mockTournaments } from "@/lib/mock-data";
import type { Tab } from "@/features/tournaments/$id/components/TournamentTabs";
import type { TournamentDetail } from "@/features/tournaments/types";

export const Route = createFileRoute("/tournaments/$id")({
  loader: ({ params }): { tournament: TournamentDetail } => {
    // Try the rich detail record first
    const detail = mockTournamentDetails[params.id];
    if (detail) return { tournament: detail };

    // Fall back to summary data from the directory for tournaments without detail records
    const summary = mockTournaments.find((t) => t.id === params.id && t.status !== "Draft");
    if (!summary) throw notFound();

    // Synthesise a minimal TournamentDetail from the summary so the page still renders
    const fallback: TournamentDetail = {
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

    return { tournament: fallback };
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
  const loaderData = Route.useLoaderData();
  const tournament = loaderData!.tournament as TournamentDetail;
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <TournamentHero tournament={tournament} />

      <TournamentTabs
        active={activeTab}
        onChange={setActiveTab}
        teamCount={tournament.teams.length}
      />

      <main className="relative bg-[oklch(0.05_0_0)]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        <div className="relative mx-auto max-w-7xl px-6 py-12">
          {activeTab === "overview" && (
            <div role="tabpanel" id="tab-panel-overview" aria-labelledby="tab-overview">
              <OverviewTab tournament={tournament} />
            </div>
          )}
          {activeTab === "teams" && (
            <div role="tabpanel" id="tab-panel-teams" aria-labelledby="tab-teams">
              <TeamsTab teams={tournament.teams} />
            </div>
          )}
          {activeTab === "bracket" && (
            <div role="tabpanel" id="tab-panel-bracket" aria-labelledby="tab-bracket">
              <BracketTab bracket={tournament.bracket} format={tournament.format} />
            </div>
          )}
          {activeTab === "rules" && (
            <div role="tabpanel" id="tab-panel-rules" aria-labelledby="tab-rules">
              <RulesTab rules={tournament.rules} contact={tournament.contact} />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
