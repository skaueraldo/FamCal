import type { CalEvent, RepeatRule } from "../types";
import { addDays, formatDayShort, formatTime, parseISODate, toISODate } from "./dates";
import type { Lang } from "./i18n";

export const EVENT_COLORS = ["#e53935", "#fb8c00", "#43a047", "#1e88e5", "#8e24aa", "#d81b60", "#00897b", "#6d4c41", "#3949ab", "#00acc1"];

const COLOR_UPGRADES: Record<string, string> = {
  "#8a9bb0": "#1e88e5",
  "#7d9b88": "#43a047",
  "#c4a4b0": "#d81b60",
  "#a8b8c8": "#3949ab",
  "#d4b4a0": "#fb8c00",
  "#9aa8c4": "#00acc1",
  "#b8a7d4": "#8e24aa",
  "#7eb8b0": "#00897b",
  "#d4a5a5": "#e53935",
  "#c9b8a0": "#6d4c41",
};

export function normalizeColor(color: string | undefined): string {
  const value = String(color || "").trim();
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : "";
  return COLOR_UPGRADES[hex] || hex;
}

export function nextFreeMemberColor(used: Iterable<string>, keep = ""): string {
  const taken = new Set([...used].map((color) => normalizeColor(color)).filter(Boolean));
  const kept = normalizeColor(keep);
  if (kept && EVENT_COLORS.includes(kept) && !taken.has(kept)) return kept;
  return EVENT_COLORS.find((color) => !taken.has(color)) ?? EVENT_COLORS[0];
}

export function memberColorOf(members: { id: string; color?: string }[] | undefined, memberId: string, fallback = EVENT_COLORS[0]): string {
  return normalizeColor(members?.find((member) => member.id === memberId)?.color) || fallback;
}

export interface EventOccurrence {
  event: CalEvent;
  iso: string;
  startDate: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function uniqueDates(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const iso = String(item || "").slice(0, 10);
    if (!ISO_DAY.test(iso) || seen.has(iso)) continue;
    seen.add(iso);
    out.push(iso);
  }
  out.sort();
  return out.slice(0, 62);
}

export function eventSpanEnd(event: CalEvent): string {
  const end = event.endDate?.slice(0, 10);
  return end && end >= event.date ? end : event.date;
}

export function spanLength(event: CalEvent): number {
  const start = parseISODate(event.date);
  const end = parseISODate(eventSpanEnd(event));
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export function eventDates(event: CalEvent): string[] {
  const explicit = uniqueDates(event.dates);
  if (explicit.length) return explicit;
  const days: string[] = [];
  let current = event.date.slice(0, 10);
  const last = eventSpanEnd(event);
  if (!ISO_DAY.test(current)) return [];
  while (current <= last) {
    days.push(current);
    current = toISODate(addDays(parseISODate(current), 1));
  }
  return days;
}

export function datesAreContiguous(dates: string[]): boolean {
  const sorted = uniqueDates(dates);
  if (sorted.length <= 1) return true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== toISODate(addDays(parseISODate(sorted[i - 1]), 1))) return false;
  }
  return true;
}

function dayOffset(from: string, to: string): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86400000);
}

export function shiftDate(iso: string, repeat: RepeatRule, steps: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (repeat === "daily") return toISODate(addDays(parseISODate(iso), steps));
  if (repeat === "weekly") return toISODate(addDays(parseISODate(iso), steps * 7));
  if (repeat === "monthly") return toISODate(new Date(year, month - 1 + steps, day));
  return toISODate(new Date(year + steps, month - 1, day));
}

export function occurrencesInRange(events: CalEvent[], from: string, to: string): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  for (const event of events) {
    if (!event.date) continue;
    const picked = uniqueDates(event.dates);
    const freq = event.repeat;
    const max = freq ? 400 : 1;
    if (picked.length) {
      const origin = picked[0];
      const offsets = picked.map((iso) => dayOffset(origin, iso));
      const lastOffset = offsets[offsets.length - 1] ?? 0;
      for (let i = 0; i < max; i++) {
        const startDate = freq ? shiftDate(origin, freq, i) : origin;
        if (event.repeatUntil && startDate > event.repeatUntil) break;
        if (startDate > to) break;
        const last = toISODate(addDays(parseISODate(startDate), lastOffset));
        if (last < from) continue;
        for (const offset of offsets) {
          const iso = toISODate(addDays(parseISODate(startDate), offset));
          if (iso < from || iso > to) continue;
          out.push({ event, iso, startDate });
        }
        if (!freq) break;
      }
      continue;
    }
    const span = spanLength(event);
    for (let i = 0; i < max; i++) {
      const startDate = freq ? shiftDate(event.date, freq, i) : event.date;
      if (event.repeatUntil && startDate > event.repeatUntil) break;
      if (startDate > to) break;
      const last = toISODate(addDays(parseISODate(startDate), span - 1));
      if (last < from) continue;
      for (let day = 0; day < span; day++) {
        const iso = toISODate(addDays(parseISODate(startDate), day));
        if (iso < from) continue;
        if (iso > to) break;
        out.push({ event, iso, startDate });
      }
      if (!freq) break;
    }
  }
  out.sort(
    (a, b) =>
      a.iso.localeCompare(b.iso) ||
      (a.event.start || "").localeCompare(b.event.start || "") ||
      a.event.title.localeCompare(b.event.title),
  );
  return out;
}

export function occurrencesOnDay(events: CalEvent[], iso: string): EventOccurrence[] {
  return occurrencesInRange(events, iso, iso);
}

export function groupOccurrencesByDay(events: CalEvent[], from: string, to: string): Map<string, EventOccurrence[]> {
  const map = new Map<string, EventOccurrence[]>();
  for (const occ of occurrencesInRange(events, from, to)) {
    const list = map.get(occ.iso) ?? [];
    list.push(occ);
    map.set(occ.iso, list);
  }
  return map;
}

export function occurrenceEndDate(occ: EventOccurrence): string {
  return toISODate(addDays(parseISODate(occ.startDate), spanLength(occ.event) - 1));
}

export function formatOccurrenceWhen(
  occ: EventOccurrence,
  lang: Lang,
  labels: { allDay: string; daily: string; weekly: string; monthly: string; yearly: string; daysCount: string },
): string {
  const event = occ.event;
  const days = eventDates(event);
  const multi = days.length > 1;
  const repeat =
    event.repeat === "daily"
      ? labels.daily
      : event.repeat === "weekly"
        ? labels.weekly
        : event.repeat === "monthly"
          ? labels.monthly
          : event.repeat === "yearly"
            ? labels.yearly
            : "";
  const time = event.start
    ? event.end
      ? `${formatTime(event.start, lang)} – ${formatTime(event.end, lang)}`
      : formatTime(event.start, lang)
    : "";
  const range = !multi
    ? ""
    : datesAreContiguous(days)
      ? `${formatDayShort(days[0], lang)} – ${formatDayShort(days[days.length - 1], lang)}`
      : days.length <= 4
        ? days.map((iso) => formatDayShort(iso, lang)).join(", ")
        : labels.daysCount;
  const parts = [range, time || (multi ? "" : labels.allDay), repeat].filter(Boolean);
  return parts.join(" · ");
}
