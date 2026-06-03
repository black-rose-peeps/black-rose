import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { TournamentsManagement } from "@/features/admin/features/tournaments/components/TournamentsManagement";

export const Route = createFileRoute("/admin/tournaments/")({
  component: TournamentsPage,
});

function TournamentsPage() {
  return (
    <>
      <AdminTopbar title="Tournaments" subtitle="Tournament Management" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <TournamentsManagement />
      </div>
    </>
  );
}
