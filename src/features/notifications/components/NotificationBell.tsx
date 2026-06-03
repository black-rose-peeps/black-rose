import { useState, useEffect, useRef } from "react";
import {
  Bell,
  X,
  CheckCheck,
  Trophy,
  Users2,
  Megaphone,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../store";
import type { AppNotification, NotificationType } from "../types";

// ── Icon per notification type ────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  team_invite: <Users2 className="h-4 w-4" />,
  invite_accepted: <Users2 className="h-4 w-4" />,
  invite_declined: <Users2 className="h-4 w-4" />,
  tournament_new: <Trophy className="h-4 w-4" />,
  tournament_open: <Trophy className="h-4 w-4" />,
  registration_approved: <ShieldCheck className="h-4 w-4" />,
  registration_rejected: <ShieldCheck className="h-4 w-4" />,
  match_scheduled: <Calendar className="h-4 w-4" />,
  announcement: <Megaphone className="h-4 w-4" />,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  team_invite: "text-sky-400",
  invite_accepted: "text-emerald-400",
  invite_declined: "text-red-400",
  tournament_new: "text-amber-400",
  tournament_open: "text-emerald-400",
  registration_approved: "text-emerald-400",
  registration_rejected: "text-red-400",
  match_scheduled: "text-white",
  announcement: "text-muted-foreground",
};

// ── Relative time helper ──────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync state from store
  function refresh() {
    setNotifications(getNotifications());
    setUnread(getUnreadCount());
  }

  useEffect(() => {
    refresh();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    refresh();
  }

  function handleRead(id: string) {
    markAsRead(id);
    refresh();
  }

  function handleMarkAll() {
    markAllAsRead();
    refresh();
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="cursor-pointer relative flex h-9 w-9 items-center justify-center border border-white/10 bg-white/5 text-muted-foreground transition hover:border-white/20 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-white font-tech text-[9px] tracking-wider-2 text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 border border-white/12 bg-[oklch(0.08_0_0)] shadow-[0_16px_48px_rgba(0,0,0,0.8)]">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="text-[10px] font-tech uppercase tracking-wider-2 text-foreground">
              Notifications
              {unread > 0 && (
                <span className="ml-2 border border-white/15 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  {unread} new
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  All read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground/50 transition hover:text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <ul className="max-h-112 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <li className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              </li>
            ) : (
              notifications.map((n) => {
                const icon = TYPE_ICON[n.type];
                const color = TYPE_COLOR[n.type];
                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3.5 transition ${
                      !n.read ? "bg-white/3" : ""
                    } hover:bg-white/5`}
                  >
                    {/* Type icon */}
                    <span className={`mt-0.5 shrink-0 ${color}`}>{icon}</span>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-medium leading-tight ${!n.read ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[9px] font-tech text-muted-foreground/50">
                          {relativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                        {n.body}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                    )}
                  </div>
                );

                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        to={n.href as "/"}
                        onClick={() => {
                          handleRead(n.id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRead(n.id)}
                        className="block w-full text-left"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-white/8 px-4 py-2.5 text-center">
              <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/40">
                {notifications.length} total · syncs on login
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
