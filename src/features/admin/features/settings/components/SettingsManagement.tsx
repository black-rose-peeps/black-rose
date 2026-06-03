import { useState } from "react";
import { Panel, PanelHeader, PrimaryButton } from "@/features/admin/components/ui";
import { SettingsField, SettingsToggle } from "@/features/admin/components/SettingsControls";

export function SettingsManagement() {
  const [require2fa, setRequire2fa] = useState(true);
  const [autoApproveTeams, setAutoApproveTeams] = useState(false);
  const [lockBracketEdits, setLockBracketEdits] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);

  return (
    <>
      <Panel>
        <PanelHeader eyebrow="Organization" title="Black Rose Profile" />
        <div className="grid grid-cols-1 gap-5 px-6 py-6 md:grid-cols-2">
          <SettingsField label="Organization Name">
            <input
              type="text"
              defaultValue="Black Rose"
              className="w-full px-3 py-2 bg-input border border-border rounded text-foreground"
            />
          </SettingsField>
          <SettingsField label="Region">
            <input
              type="text"
              defaultValue="APAC"
              className="w-full px-3 py-2 bg-input border border-border rounded text-foreground"
            />
          </SettingsField>
          <SettingsField label="Support Email">
            <input
              type="email"
              defaultValue="ops@blackrose.gg"
              className="w-full px-3 py-2 bg-input border border-border rounded text-foreground"
            />
          </SettingsField>
          <SettingsField label="Default Timezone">
            <input
              type="text"
              defaultValue="UTC+08"
              className="w-full px-3 py-2 bg-input border border-border rounded text-foreground"
            />
          </SettingsField>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          eyebrow="Security"
          title="Access Controls"
          actions={<PrimaryButton>Save Changes</PrimaryButton>}
        />
        <div className="grid grid-cols-1 gap-5 px-6 py-6 md:grid-cols-2">
          <SettingsToggle
            label="Require 2FA for admins"
            checked={require2fa}
            onChange={setRequire2fa}
          />
          <SettingsToggle
            label="Auto-approve verified teams"
            checked={autoApproveTeams}
            onChange={setAutoApproveTeams}
          />
          <SettingsToggle
            label="Lock bracket edits during live matches"
            checked={lockBracketEdits}
            onChange={setLockBracketEdits}
          />
          <SettingsToggle
            label="Email digest to super admins"
            checked={emailDigest}
            onChange={setEmailDigest}
          />
        </div>
      </Panel>
    </>
  );
}
