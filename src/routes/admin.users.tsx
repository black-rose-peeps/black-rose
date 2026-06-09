import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout route — parent for /admin/users and /admin/users/$memberId */
export const Route = createFileRoute("/admin/users")({
  component: () => <Outlet />,
});
