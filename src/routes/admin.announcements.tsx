import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { AnnouncementsManagement } from "@/features/admin/features/announcements/components/AnnouncementsManagement";

export const Route = createFileRoute("/admin/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  return (
    <>
      <AdminTopbar title="Announcements" subtitle="Broadcast Center" />
      <AdminPageContent>
        <AnnouncementsManagement />
      </AdminPageContent>
    </>
  );
}
