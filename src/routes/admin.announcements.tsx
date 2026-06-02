import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { Panel, PanelHeader, PrimaryButton } from "@/components/admin/ui";

const announcements = [
  { id: "a-1", title: "Valorant Nightfall Cup — Bracket Released", date: "2026-06-01", body: "Group stage seeding is live. Captains, check your portal." },
  { id: "a-2", title: "MLBB Thorne Invitational — Check-in Open", date: "2026-05-30", body: "All approved teams must check in 30 minutes before match time." },
  { id: "a-3", title: "Platform Maintenance Window", date: "2026-05-28", body: "Brackets and registration will be paused on Sunday 02:00–04:00 UTC." },
];

export const Route = createFileRoute("/admin/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  return (
    <>
      <AdminTopbar title="Announcements" subtitle="Broadcast Center" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
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
      </div>
    </>
  );
}
