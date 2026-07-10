import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { TeamsManagement } from "@/features/admin/features/teams/components/TeamsManagement";

export const Route = createFileRoute("/admin/teams")({
  component: TeamsPage,
});

function TeamsPage() {
  return (
    <>
      <AdminTopbar title="Teams" subtitle="Team Directory" />
      <AdminPageContent>
        <TeamsManagement />
      </AdminPageContent>
    </>
  );
}
