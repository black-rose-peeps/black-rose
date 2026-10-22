import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — team creation is now a modal in the dashboard teams view */
export const Route = createFileRoute("/teams/create")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", search: { view: "teams", create: true }, replace: true });
  },
});
