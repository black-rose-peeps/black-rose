import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { isAdminConsoleAuthenticated } from "@/features/admin/auth/admin-session";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!isAdminConsoleAuthenticated()) {
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdminConsoleAuthenticated()) {
      navigate({ to: "/login", search: { console: "1" } });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
