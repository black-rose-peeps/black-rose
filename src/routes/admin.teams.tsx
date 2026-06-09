import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { TeamsManagement } from "@/features/admin/features/teams/components/TeamsManagement";

export const Route = createFileRoute("/admin/teams")({
  component: TeamsPage,
});

function TeamsPage() {
  return (
    <>
      <AdminTopbar title="Teams" subtitle="Team Directory" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <TeamsManagement />
      </div>
    </>
  );
}
