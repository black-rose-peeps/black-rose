import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { Panel, PanelHeader, PrimaryButton } from "@/features/admin/components/ui";
import { SettingsField, SettingsToggle } from "@/features/admin/components/SettingsControls";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <AdminTopbar title="Settings" subtitle="Console Preferences" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <Panel>
          <PanelHeader eyebrow="Organization" title="Black Rose Profile" />
          <div className="grid grid-cols-1 gap-5 px-6 py-6 md:grid-cols-2">
            <SettingsField label="Organization Name" value="Black Rose" />
            <SettingsField label="Region" value="APAC" />
            <SettingsField label="Support Email" value="ops@blackrose.gg" />
            <SettingsField label="Default Timezone" value="UTC+08" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Security"
            title="Access Controls"
            actions={<PrimaryButton>Save Changes</PrimaryButton>}
          />
          <div className="grid grid-cols-1 gap-5 px-6 py-6 md:grid-cols-2">
            <SettingsToggle label="Require 2FA for admins" enabled />
            <SettingsToggle label="Auto-approve verified teams" enabled={false} />
            <SettingsToggle label="Lock bracket edits during live matches" enabled />
            <SettingsToggle label="Email digest to super admins" enabled />
          </div>
        </Panel>
      </div>
    </>
  );
}
