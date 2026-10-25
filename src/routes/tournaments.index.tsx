import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { ChampionArchive } from "@/features/championships/components/ChampionArchive";
import { TournamentDirectory } from "@/features/tournaments/components/TournamentDirectory";
import { HubNavigation } from "@/features/shared/components/HubNavigation";
import { tournamentHubSearch } from "@/features/shared/utils/hub-search";

export const Route = createFileRoute("/tournaments/")({
  validateSearch: tournamentHubSearch,
  loaderDeps: ({ search }) => ({ view: search.view }),
  head: ({ match }) => ({
    meta: [
      {
        title:
          match.loaderDeps.view === "champions"
            ? "Hall of Champions — Black Rose"
            : "Tournaments — Black Rose",
      },
      {
        name: "description",
        content:
          match.loaderDeps.view === "champions"
            ? "Browse every team crowned in Black Rose competition. Explore victory portraits, legacy stories, and championship rosters."
            : "Browse Black Rose community esports tournaments. Filter by game and status, register your team, and compete.",
      },
    ],
  }),
  component: TournamentsPage,
});

function TournamentsPage() {
  const { view } = Route.useSearch();
  const navigation = <HubNavigation hub="tournaments" view={view ?? "browse"} />;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      {view === "champions" ? (
        <ChampionArchive navigation={navigation} />
      ) : (
        <TournamentDirectory navigation={navigation} />
      )}
      <Footer />
    </div>
  );
}
