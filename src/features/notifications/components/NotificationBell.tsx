import { useState, useEffect, useRef } from "react";
import {
  Radar,
  X,
  CheckCheck,
  Trophy,
  Users2,
  UserMinus,
  Megaphone,
  Calendar,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
} from "../store";
import type { AppNotification, NotificationType } from "../types";
import { relativeTime } from "../utils/relative-time";

// ── Icon per notification type ────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  team_invite: <Users2 className="h-4 w-4" />,
  team_removed: <UserMinus className="h-4 w-4" />,
  invite_accepted: <Users2 className="h-4 w-4" />,
  invite_declined: <Users2 className="h-4 w-4" />,
  tournament_new: <Trophy className="h-4 w-4" />,
  tournament_open: <Trophy className="h-4 w-4" />,
  tournament_live: <Trophy className="h-4 w-4" />,
  registration_approved: <ShieldCheck className="h-4 w-4" />,
  registration_rejected: <ShieldCheck className="h-4 w-4" />,
  registration_request: <Trophy className="h-4 w-4" />,
  profile_comment: <MessageSquare className="h-4 w-4" />,
  match_scheduled: <Calendar className="h-4 w-4" />,
  announcement: <Megaphone className="h-4 w-4" />,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  team_invite: "text-sky-400",
  team_removed: "text-red-400",
  invite_accepted: "text-emerald-400",
  invite_declined: "text-red-400",
  tournament_new: "text-amber-400",
  tournament_open: "text-emerald-400",
  tournament_live: "text-white",
  registration_approved: "text-emerald-400",
  registration_rejected: "text-red-400",
  registration_request: "text-amber-400",
  profile_comment: "text-violet-400",
  match_scheduled: "text-white",
  announcement: "text-muted-foreground",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [, setTimeTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync state from store
  function refresh() {
    setNotifications(getNotifications());
    setUnread(getUnreadCount());
  }

  useEffect(() => {
    refresh();
    return subscribeToNotifications(refresh);
  }, []);

  // Re-render relative timestamps as time passes (e.g. "just now" → "5m ago").
  useEffect(() => {
    const id = window.setInterval(() => setTimeTick((tick) => tick + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Close on outside click OR Escape key
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKeydown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeydown);
    };
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
      {/* Alert feed trigger */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        className={`clip-tab relative flex h-10 w-10 cursor-pointer items-center justify-center border bg-white/[0.04] text-muted-foreground transition hover:border-white/25 hover:bg-white/[0.07] hover:text-foreground ${
          unread > 0 ? "border-white/20" : "border-white/10"
        }`}
      >
        <Radar
          className={`h-4 w-4 ${unread > 0 ? "text-foreground" : ""}`}
          strokeWidth={1.5}
        />
        {unread > 0 && (
          <>
            <span className="pointer-events-none absolute inset-0 animate-pulse-soft bg-white/[0.04]" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-white px-0.5 font-tech text-label-readable tracking-wider-2 text-black">
              {unread > 9 ? "9+" : unread}
            </span>
          </>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 border border-white/12 bg-[oklch(0.08_0_0)] shadow-[0_16px_48px_rgba(0,0,0,0.8)]">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="font-tech text-label-readable uppercase text-foreground">
              Notifications
              {unread > 0 && (
                <span className="ml-2 border border-white/15 px-1.5 py-0.5 text-sm text-muted-foreground">
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
                  className="flex items-center gap-1 font-tech text-label-readable uppercase text-muted-foreground transition hover:text-foreground"
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
                <Radar className="h-6 w-6 text-muted-foreground/30" strokeWidth={1.25} />
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
                        <span className="shrink-0 font-tech text-label-readable text-muted-foreground/50">
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

                const teamInviteMatch = n.href?.match(/^\/teams\/([^/]+)$/);
                const memberProfileMatch = n.href?.match(/^\/members\/([^/]+)$/);

                return (
                  <li key={n.id}>
                    {n.href === "/teams" ? (
                      <Link
                        to="/teams"
                        search={{ create: false }}
                        onClick={() => {
                          handleRead(n.id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {content}
                      </Link>
                    ) : teamInviteMatch ? (
                      <Link
                        to="/teams/$id"
                        params={{ id: teamInviteMatch[1] }}
                        onClick={() => {
                          handleRead(n.id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {content}
                      </Link>
                    ) : memberProfileMatch ? (
                      <Link
                        to="/members/$slug"
                        params={{ slug: memberProfileMatch[1] }}
                        onClick={() => {
                          handleRead(n.id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {content}
                      </Link>
                    ) : n.href ? (
                      <a
                        href={n.href}
                        onClick={() => {
                          handleRead(n.id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {content}
                      </a>
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
              <p className="font-tech text-label-readable uppercase text-muted-foreground/40">
                {notifications.length} total · syncs automatically
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
