import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route — parent for /servers, /servers/$id
// Renders nothing itself, just passes through to the matched child route.
export const Route = createFileRoute("/servers")({
  component: () => <Outlet />,
});
