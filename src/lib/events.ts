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

export function eventSpanEnd(event: CalEvent): string {
  const end = event.endDate?.slice(0, 10);
  return end && end >= event.date ? end : event.date;
}

export function spanLength(event: CalEvent): number {
  const start = parseISODate(event.date);
  const end = parseISODate(eventSpanEnd(event));
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
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
    const span = spanLength(event);
    const freq = event.repeat;
    const max = freq ? 400 : 1;
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
  labels: { allDay: string; daily: string; weekly: string; monthly: string; yearly: string },
): string {
  const event = occ.event;
  const endDate = occurrenceEndDate(occ);
  const multi = occ.startDate !== endDate;
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
  const range = multi ? `${formatDayShort(occ.startDate, lang)} – ${formatDayShort(endDate, lang)}` : "";
  const parts = [range, time || (multi ? "" : labels.allDay), repeat].filter(Boolean);
  return parts.join(" · ");
}
