import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { TournamentsManagement } from "@/features/admin/features/tournaments/components/TournamentsManagement";

export const Route = createFileRoute("/admin/tournaments/")({
  component: TournamentsPage,
});

function TournamentsPage() {
  return (
    <>
      <AdminTopbar title="Tournaments" subtitle="Tournament Management" />
      <AdminPageContent>
        <TournamentsManagement />
      </AdminPageContent>
    </>
  );
}
