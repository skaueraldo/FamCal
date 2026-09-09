import type { CalEvent } from "../types";

const NOTIFIED_KEY = "famcal.notified";
const LEAD_MS = 30 * 60 * 1000;
const TIMED_UNTIL_MS = 2 * 60 * 1000;
const ALL_DAY_UNTIL_MS = 30 * 60 * 1000;
const MAX_TAGS = 400;

export type NoticeTab = "calendar" | "dinner" | "shopping" | "wishlist";

export interface Notice {
  title: string;
  body: string;
  tag: string;
  tab?: NoticeTab;
}

function loadNotified(): Record<string, number> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const next: Record<string, number> = {};
    for (const [tag, at] of Object.entries(parsed)) {
      if (typeof at === "number" && at > cutoff) next[tag] = at;
    }
    return next;
  } catch {
    return {};
  }
}

function saveNotified(map: Record<string, number>): void {
  const entries = Object.entries(map);
  const trimmed =
    entries.length > MAX_TAGS ? Object.fromEntries(entries.slice(entries.length - MAX_TAGS)) : Object.fromEntries(entries);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(trimmed));
}

export function wasNotified(tag: string): boolean {
  return Boolean(loadNotified()[tag]);
}

export function markNotified(tag: string): void {
  const map = loadNotified();
  map[tag] = Date.now();
  saveNotified(map);
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (result === "granted") await ensureServiceWorker();
  return result === "granted";
}

export async function showNotice(notice: Notice): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const options: NotificationOptions = {
    body: notice.body,
    tag: notice.tag,
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    data: { url: "/", tab: notice.tab ?? "calendar" },
  };
  try {
    const reg =
      "serviceWorker" in navigator
        ? (await navigator.serviceWorker.getRegistration()) ?? (await ensureServiceWorker())
        : null;
    if (reg?.showNotification) {
      await reg.showNotification(notice.title, options);
      return true;
    }
    new Notification(notice.title, options);
    return true;
  } catch {
    return false;
  }
}

export function eventStartMs(event: CalEvent): number | null {
  const [y, m, d] = event.date.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (!event.start) return new Date(y, m - 1, d, 8, 0, 0).getTime();
  const [hh, mm] = event.start.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return new Date(y, m - 1, d, hh, mm, 0).getTime();
}

export function reminderWindow(event: CalEvent, now = Date.now()): boolean {
  const start = eventStartMs(event);
  if (start == null) return false;
  const remindAt = event.start ? start - LEAD_MS : start;
  const until = event.start ? start + TIMED_UNTIL_MS : start + ALL_DAY_UNTIL_MS;
  return now >= remindAt && now <= until;
}

export function reminderTag(event: CalEvent): string {
  return `event:${event.id}:${event.date}`;
}
