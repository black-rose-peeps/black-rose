import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route — shared parent for /tournaments and /tournaments/$id.
// Renders nothing itself, just passes through to the matched child route.
export const Route = createFileRoute("/tournaments")({
  component: () => <Outlet />,
});
