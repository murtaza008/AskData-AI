"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, Clock, FileUp, MessageSquareText, Pin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/menu";
import { formatCount, formatRelative } from "@/lib/format";
import { useIdle } from "@/lib/hooks/use-idle";
import { type ConversationSummary, type Pin as PinDTO, q } from "@/lib/queries";
import type { UploadDTO } from "@/lib/uploads/types";

/**
 * Notifications built only from real events in the user's own data: answers
 * from the last 7 days, pinned charts, uploaded tables, and uploads about to
 * be deleted. "Seen" is remembered per browser.
 */

type Event = { id: string; at: string; text: string; href: string; icon: typeof Bell; urgent?: boolean };

const SEEN_KEY = "askdata:notifications-seen";
const SEEN_EVENT = "askdata:notifications-seen";
const WEEK = 7 * 86_400_000;
const SOON = 3 * 86_400_000;

function readSeen(): number {
  try {
    return Number(window.localStorage.getItem(SEEN_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function subscribeSeen(onChange: () => void) {
  window.addEventListener(SEEN_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SEEN_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function buildEvents(
  now: number,
  conversations: ConversationSummary[] = [],
  pins: PinDTO[] = [],
  uploads: UploadDTO[] = [],
): Event[] {
  const events: Event[] = [];
  for (const c of conversations) {
    if (now - Date.parse(c.updatedAt) > WEEK) continue;
    events.push({ id: `c-${c.id}-${c.updatedAt}`, at: c.updatedAt, text: `Answered: ${c.title}`, href: `/app/c/${c.id}`, icon: MessageSquareText });
  }
  for (const p of pins) {
    if (now - Date.parse(p.createdAt) > WEEK) continue;
    events.push({ id: `p-${p.id}`, at: p.createdAt, text: `Pinned “${p.title}” to the dashboard`, href: "/app/dashboard", icon: Pin });
  }
  for (const u of uploads) {
    if (u.isSample) continue;
    const expires = Date.parse(u.expiresAt);
    if (expires - now < SOON) {
      // Surfaces when the deletion is 3 days away.
      events.push({
        id: `x-${u.id}`,
        at: new Date(expires - SOON).toISOString(),
        text: `${u.originalName} will be deleted ${formatRelative(u.expiresAt, now)}`,
        href: "/app/upload",
        icon: Clock,
        urgent: true,
      });
    }
    if (now - Date.parse(u.createdAt) <= WEEK) {
      events.push({
        id: `u-${u.id}`,
        at: u.createdAt,
        text: `Added ${u.originalName} (${formatCount(u.rowCount)} rows)`,
        href: "/app/upload",
        icon: FileUp,
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
}

export function Notifications() {
  const router = useRouter();
  const idle = useIdle();
  const conversations = useQuery({ ...q.conversations(), enabled: idle });
  const pins = useQuery({ ...q.pins(), enabled: idle });
  const uploads = useQuery({ ...q.uploads(), enabled: idle });
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => Number.MAX_SAFE_INTEGER);
  // "Now" for the event windows: when the newest data arrived (pure, and only known in the browser).
  const now = Math.max(conversations.dataUpdatedAt, pins.dataUpdatedAt, uploads.dataUpdatedAt);

  const loading = !idle || conversations.isLoading || pins.isLoading || uploads.isLoading;
  const events = useMemo(
    () => (loading ? [] : buildEvents(now, conversations.data, pins.data, uploads.data?.uploads)),
    [loading, now, conversations.data, pins.data, uploads.data],
  );
  const unread = events.filter((event) => Date.parse(event.at) > seen).length;

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      // not remembered; fine
    }
    window.dispatchEvent(new Event(SEEN_EVENT));
  }, []);

  return (
    <Menu onOpenChange={(open) => !open && markSeen()}>
      <MenuTrigger asChild>
        <IconButton label={unread ? `Notifications, ${unread} new` : "Notifications"} className="relative">
          <Bell aria-hidden className="size-4" strokeWidth={1.75} />
          {unread > 0 && (
            <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent ring-2 ring-surface" />
          )}
        </IconButton>
      </MenuTrigger>
      <MenuContent className="w-[340px]">
        <MenuLabel>Recent activity</MenuLabel>
        {loading ? (
          <MenuItem disabled className="text-fg-muted data-[disabled]:opacity-100">
            Loading activity…
          </MenuItem>
        ) : events.length === 0 ? (
          <MenuItem disabled className="text-fg-muted data-[disabled]:opacity-100">
            Nothing in the last 7 days. Ask a question to get started.
          </MenuItem>
        ) : (
          events.map((event) => {
            const Icon = event.icon;
            const isNew = Date.parse(event.at) > seen;
            return (
              <MenuItem key={event.id} onSelect={() => router.push(event.href)} className="items-start py-2">
                <Icon aria-hidden className={event.urgent ? "mt-0.5 !text-danger-text" : "mt-0.5"} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2">{event.text}</span>
                  <span className="mt-0.5 block text-[12px] text-fg-muted">
                    {formatRelative(event.at)}
                    {isNew && <span className="ml-1.5 font-medium text-accent-text">New</span>}
                  </span>
                </span>
              </MenuItem>
            );
          })
        )}
      </MenuContent>
    </Menu>
  );
}
