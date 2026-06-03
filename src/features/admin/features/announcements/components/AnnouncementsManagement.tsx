import { Panel, PanelHeader, PrimaryButton } from "@/features/admin/components/ui";
import { announcements } from "../constants/mockData";

export function AnnouncementsManagement() {
  return (
    <Panel>
      <PanelHeader
        eyebrow="Published"
        title="Latest Broadcasts"
        actions={<PrimaryButton>New Announcement</PrimaryButton>}
      />
      <div className="divide-y divide-border">
        {announcements.map((a) => (
          <div key={a.id} className="px-6 py-5">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg tracking-wider-2">{a.title}</h4>
              <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                {a.date}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
