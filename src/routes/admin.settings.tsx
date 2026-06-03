import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { SettingsManagement } from "@/features/admin/features/settings/components/SettingsManagement";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <AdminTopbar title="Settings" subtitle="Console Preferences" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <SettingsManagement />
      </div>
    </>
  );
}
