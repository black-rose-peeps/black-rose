import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { ParticipantsManagement } from "@/features/admin/features/participants/components/ParticipantsManagement";

export const Route = createFileRoute("/admin/participants")({
  component: ParticipantsPage,
});

function ParticipantsPage() {
  return (
    <>
      <AdminTopbar title="Participants" subtitle="Registrations Queue" />
      <AdminPageContent>
        <ParticipantsManagement />
      </AdminPageContent>
    </>
  );
}
