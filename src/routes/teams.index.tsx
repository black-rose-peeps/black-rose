import { createFileRoute, redirect } from "@tanstack/react-router";
import { legacyTeamsSearch } from "@/features/shared/utils/hub-search";

/** Preserve legacy list/create links without changing team-detail routes. */
export const Route = createFileRoute("/teams/")({
  validateSearch: legacyTeamsSearch,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/dashboard", search, replace: true });
  },
});
