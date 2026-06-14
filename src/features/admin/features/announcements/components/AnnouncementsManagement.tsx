import { Megaphone } from "lucide-react";
import { Panel, PanelHeader, PrimaryButton } from "@/features/admin/components/ui";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminEmptyTitle } from "@/features/admin/constants/empty-state-titles";
import { announcements } from "../constants/mockData";

export function AnnouncementsManagement() {
  const hasAnnouncements = announcements.length > 0;

  return (
    <Panel>
      <PanelHeader
        eyebrow="Published"
        title="Latest Broadcasts"
        actions={<PrimaryButton>New Announcement</PrimaryButton>}
      />
      {hasAnnouncements ? (
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
      ) : (
        <div className="px-6 py-8">
          <AdminEmptyState
            embedded
            eyebrow="Broadcasts"
            title={<AdminEmptyTitle noun="announcements" />}
            description="Platform-wide announcements appear here once published. Use them for bracket releases, check-in reminders, maintenance windows, and community updates."
            actions={
              <PrimaryButton className="gap-2">
                <Megaphone className="h-4 w-4" />
                New Announcement
              </PrimaryButton>
            }
          />
        </div>
      )}
    </Panel>
  );
}
