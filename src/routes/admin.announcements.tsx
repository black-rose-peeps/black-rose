import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AnnouncementsManagement } from "@/features/admin/features/announcements/components/AnnouncementsManagement";

export const Route = createFileRoute("/admin/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  return (
    <>
      <AdminTopbar title="Announcements" subtitle="Broadcast Center" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <AnnouncementsManagement />
      </div>
    </>
  );
}
