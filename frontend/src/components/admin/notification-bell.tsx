"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarCheck, CheckCheck, FileText, Inbox, Star, Wallet } from "lucide-react";
import type { AdminNotification, NotificationFeed } from "@dilruba/shared/ops";
import { adminFetch } from "@/lib/admin-api";
import { formatDate } from "./ui";

const POLL_MS = 60_000;

const icons: Record<string, typeof Bell> = { lead: Inbox, followup: Bell, booking: CalendarCheck, payment: Wallet, quote: FileText, feedback: Star };

/**
 * The bell: the person's own alerts (new and assigned leads, follow-ups due, bookings, payments,
 * quote answers, low ratings). Checks every minute while the tab is open and visible.
 */
export function NotificationBell() {
  const router = useRouter();
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setFeed(await adminFetch<NotificationFeed>("/notifications"));
    } catch {
      // A missed check is fine; the next one will catch up.
    }
  }, []);

  useEffect(() => {
    // Fetching on mount and on a timer: alerts arrive from the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !panel.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function markRead(ids?: number[]) {
    setFeed((f) => f && { unread: ids ? Math.max(0, f.unread - f.items.filter((n) => ids.includes(n.id) && !n.read).length) : 0, items: f.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)) });
    await adminFetch("/notifications/read", { method: "POST", body: ids ? { ids } : {} }).catch(() => {});
  }

  function openItem(n: AdminNotification) {
    if (!n.read) void markRead([n.id]);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  const unread = feed?.unread ?? 0;

  return (
    <div ref={panel} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-ink/70 hover:bg-sand hover:text-ink"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-[1.1rem] text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl shadow-black/15 lg:left-0 lg:right-auto">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => void markRead()} className="inline-flex items-center gap-1 text-xs font-medium text-brand">
                <CheckCheck className="size-4" aria-hidden /> Mark all read
              </button>
            )}
          </div>
          {!feed ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>
          ) : feed.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet. New leads, follow-ups due, bookings and payments will show here.</p>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
              {feed.items.map((n) => {
                const Icon = icons[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => openItem(n)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-sand ${n.read ? "" : "bg-brand/[0.04]"}`}>
                      <span className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full ${n.read ? "bg-sand text-muted" : "bg-brand/10 text-brand"}`}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.read ? "text-ink/80" : "font-semibold text-ink"}`}>{n.title}</span>
                        {n.body && <span className="mt-0.5 block truncate text-xs text-muted">{n.body}</span>}
                        <span className="mt-0.5 block text-[11px] text-muted">{formatDate(n.createdAt, true)}</span>
                      </span>
                      {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
