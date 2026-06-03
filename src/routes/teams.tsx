import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route — parent for /teams, /teams/create, /teams/$id
export const Route = createFileRoute("/teams")({
  component: () => <Outlet />,
});
