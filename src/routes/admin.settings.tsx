import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { SettingsManagement } from "@/features/admin/features/settings/components/SettingsManagement";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <AdminTopbar title="Settings" subtitle="Console Preferences" />
      <AdminPageContent>
        <SettingsManagement />
      </AdminPageContent>
    </>
  );
}
