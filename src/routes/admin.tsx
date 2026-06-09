import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { ensureAdminConsoleSession } from "@/features/admin/auth/admin-session";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const valid = await ensureAdminConsoleSession();
    if (!valid) {
      throw redirect({
        to: "/login",
        search: { console: "1" },
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin Console — Black Rose" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AdminSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none fixed inset-0 left-64 grid-bg opacity-20" />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
