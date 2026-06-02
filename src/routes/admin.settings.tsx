import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { Panel, PanelHeader, PrimaryButton } from "@/components/admin/ui";

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
            <Field label="Organization Name" value="Black Rose" />
            <Field label="Region" value="APAC" />
            <Field label="Support Email" value="ops@blackrose.gg" />
            <Field label="Default Timezone" value="UTC+08" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Security"
            title="Access Controls"
            actions={<PrimaryButton>Save Changes</PrimaryButton>}
          />
          <div className="grid grid-cols-1 gap-5 px-6 py-6 md:grid-cols-2">
            <Toggle label="Require 2FA for admins" enabled />
            <Toggle label="Auto-approve verified teams" enabled={false} />
            <Toggle label="Lock bracket edits during live matches" enabled />
            <Toggle label="Email digest to super admins" enabled />
          </div>
        </Panel>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        {label}
      </div>
      <input
        defaultValue={value}
        className="h-10 w-full border border-border bg-secondary px-3 text-sm outline-none focus:border-foreground"
      />
    </div>
  );
}

function Toggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <label className="flex items-center justify-between border border-border bg-secondary px-4 py-3">
      <span className="text-xs">{label}</span>
      <span
        className={`grid h-5 w-10 items-center border ${
          enabled ? "border-foreground bg-foreground/10" : "border-border bg-background"
        }`}
      >
        <span
          className={`h-3 w-3 bg-foreground transition ${enabled ? "translate-x-5" : "translate-x-1"}`}
        />
      </span>
    </label>
  );
}
