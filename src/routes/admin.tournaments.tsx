import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route — shared parent for /admin/tournaments and /admin/tournaments/$id.
// Renders nothing itself; child routes render via <Outlet />.
export const Route = createFileRoute("/admin/tournaments")({
  component: () => <Outlet />,
});
