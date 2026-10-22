import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback } from "react";
import { getSession } from "@/features/auth/store/session";

import { MemberPageLayout } from "@/features/member/components/MemberShell";
import { DashboardOverview } from "@/features/member/components/DashboardOverview";
import { TeamDirectory } from "@/features/teams/components/TeamDirectory";
import { MyGamesDashboard } from "@/features/game-membership/components/MyGamesDashboard";
import { HubNavigation } from "@/features/shared/components/HubNavigation";
import { dashboardHubSearch } from "@/features/shared/utils/hub-search";

export const Route = createFileRoute("/dashboard/")({
  validateSearch: dashboardHubSearch,
  beforeLoad: () => {
    // Only reject missing sessions here. Each view refreshes membership before checking
    // roles, so a stale cached role cannot discard the requested view/create intent.
    if (typeof window === "undefined") return;
    const session = getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  loaderDeps: ({ search }) => ({ view: search.view }),
  head: ({ match }) => ({
    meta: [
      {
        title:
          match.loaderDeps.view === "games"
            ? "My Games · Dashboard — Black Rose"
            : match.loaderDeps.view === "teams"
              ? "My Teams · Dashboard — Black Rose"
              : "Dashboard — Black Rose",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { view, create, focusGame } = Route.useSearch();
  const navigate = Route.useNavigate();
  const consumeCreateIntent = useCallback(() => {
    void navigate({ search: { view: "teams" }, replace: true });
  }, [navigate]);
  const navigation = <HubNavigation hub="dashboard" view={view ?? "overview"} />;
  return (
    <MemberPageLayout className="pb-12">
      {view === "teams" ? (
        <TeamDirectory
          navigation={navigation}
          openCreateFromUrl={create}
          onCreateIntentConsumed={consumeCreateIntent}
        />
      ) : view === "games" ? (
        <MyGamesDashboard
          navigation={navigation}
          focusGame={focusGame}
          onSelectGame={(gameId) => {
            void navigate({ search: { view: "games", focusGame: gameId }, resetScroll: false });
          }}
        />
      ) : (
        <DashboardOverview navigation={navigation} />
      )}
    </MemberPageLayout>
  );
}
