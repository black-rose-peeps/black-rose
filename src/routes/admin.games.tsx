import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { GamesManagement } from "@/features/admin/features/games";

export const Route = createFileRoute("/admin/games")({
  component: GamesPage,
});

function GamesPage() {
  return (
    <>
      <AdminTopbar title="Games" subtitle="Manage games configuration" />
      <AdminPageContent>
        <GamesManagement />
      </AdminPageContent>
    </>
  );
}
