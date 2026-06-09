import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { ParticipantsManagement } from "@/features/admin/features/participants/components/ParticipantsManagement";

export const Route = createFileRoute("/admin/participants")({
  component: ParticipantsPage,
});

function ParticipantsPage() {
  return (
    <>
      <AdminTopbar title="Participants" subtitle="Registrations Queue" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <ParticipantsManagement />
      </div>
    </>
  );
}
