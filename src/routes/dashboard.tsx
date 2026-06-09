import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout route — parent for /dashboard and /dashboard/profile */
export const Route = createFileRoute("/dashboard")({
  component: () => <Outlet />,
});
