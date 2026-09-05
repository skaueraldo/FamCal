import type { CalEvent } from "../types";
import { uid } from "./id";

function unfold(raw: string): string[] {
  return raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODateLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateValue(value: string): { date: string; time?: string } | null {
  const utc = /Z$/i.test(value.trim());
  const compact = value.replace(/[^0-9T]/g, "");
  const match = compact.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
  if (!match) return null;
  const [, y, mo, d, hh, mm, ss] = match;
  if (hh && mm) {
    if (utc) {
      const date = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +(ss || 0)));
      return { date: toISODateLocal(date), time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
    }
    return { date: `${y}-${mo}-${d}`, time: `${hh}:${mm}` };
  }
  return { date: `${y}-${mo}-${d}` };
}

function parseProps(block: string[]): Record<string, string> {
  const props: Record<string, string> = {};
  for (const line of block) {
    const split = line.indexOf(":");
    if (split < 0) continue;
    const left = line.slice(0, split);
    const value = line.slice(split + 1);
    const key = left.split(";")[0].toUpperCase();
    props[key] = unescapeIcs(value);
    if (key === "DTSTART" || key === "DTEND") {
      const tz = left.match(/TZID=([^;:]+)/i);
      if (tz) props[`${key}_TZ`] = tz[1];
    }
  }
  return props;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function inWindow(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

function expand(base: Omit<CalEvent, "id">, rrule: string | undefined, from: string, to: string): Omit<CalEvent, "id">[] {
  if (!rrule) {
    return inWindow(base.date, from, to) ? [base] : [];
  }

  const parts: Record<string, string> = {};
  for (const bit of rrule.split(";")) {
    const [k, v] = bit.split("=");
    if (k && v) parts[k.toUpperCase()] = v;
  }

  const freq = parts.FREQ;
  const interval = Math.max(1, Number(parts.INTERVAL || 1));
  const count = parts.COUNT ? Number(parts.COUNT) : 80;
  const until = parts.UNTIL ? parseDateValue(parts.UNTIL)?.date : undefined;
  const byday = parts.BYDAY?.split(",") ?? [];
  const out: Omit<CalEvent, "id">[] = [];

  if (freq === "WEEKLY" && byday.length) {
    const start = new Date(from);
    start.setDate(start.getDate() - 7);
    for (let i = 0; i < 120; i++) {
      const cursor = new Date(start);
      cursor.setDate(start.getDate() + i);
      const iso = toISODateLocal(cursor);
      if (iso < base.date) continue;
      if (until && iso > until) break;
      if (iso > to) continue;
      const weekday = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"][(cursor.getDay() + 6) % 7];
      const days = byday.map((code) => code.replace(/^-?\d+/, ""));
      if (!days.includes(weekday)) continue;
      const weeks = Math.floor((Date.parse(iso) - Date.parse(base.date)) / 86400000 / 7);
      if (weeks % interval !== 0) continue;
      out.push({ ...base, date: iso, uid: `${base.uid}-${iso}` });
    }
    return out;
  }

  for (let i = 0; i < count; i++) {
    let iso = base.date;
    if (freq === "DAILY") iso = addDays(base.date, i * interval);
    else if (freq === "WEEKLY") iso = addDays(base.date, i * 7 * interval);
    else if (freq === "MONTHLY") {
      const [y, m, d] = base.date.split("-").map(Number);
      const next = new Date(y, m - 1 + i * interval, d);
      iso = toISODateLocal(next);
    } else if (freq === "YEARLY") {
      const [y, m, d] = base.date.split("-").map(Number);
      iso = toISODateLocal(new Date(y + i * interval, m - 1, d));
    } else if (i > 0) break;

    if (until && iso > until) break;
    if (iso > to) break;
    if (inWindow(iso, from, to)) out.push({ ...base, date: iso, uid: i === 0 ? base.uid : `${base.uid}-${iso}` });
  }
  return out;
}

export function parseIcs(
  raw: string,
  memberId: string,
  sourceId: string,
  windowFrom?: string,
  windowTo?: string,
): CalEvent[] {
  const from = windowFrom ?? toISODateLocal(new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1));
  const to = windowTo ?? toISODateLocal(new Date(new Date().getFullYear(), new Date().getMonth() + 13, 0));
  const lines = unfold(raw);
  const events: CalEvent[] = [];
  let block: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();
    if (trimmed === "BEGIN:VEVENT") {
      block = [];
      continue;
    }
    if (trimmed === "END:VEVENT" && block) {
      const props = parseProps(block);
      const start = props.DTSTART ? parseDateValue(props.DTSTART) : null;
      const cancelled = (props.STATUS || "").toUpperCase() === "CANCELLED";
      if (start && !cancelled) {
        const end = props.DTEND ? parseDateValue(props.DTEND) : null;
        const base: Omit<CalEvent, "id"> = {
          title: (props.SUMMARY || "").trim() || "Untitled",
          date: start.date,
          start: start.time,
          end: end?.date === start.date ? end.time : undefined,
          notes: props.DESCRIPTION || props.LOCATION,
          memberId,
          sourceId,
          uid: props.UID || uid("ics"),
        };
        for (const occ of expand(base, props.RRULE, from, to)) {
          events.push({ ...occ, id: uid("evt") });
        }
      }
      block = null;
      continue;
    }
    if (block) block.push(line);
  }

  return events;
}

export function sourceNameFromIcs(raw: string, fallback: string): string {
  for (const line of unfold(raw)) {
    if (/^(X-WR-CALNAME|NAME):/i.test(line)) {
      return unescapeIcs(line.slice(line.indexOf(":") + 1).trim());
    }
  }
  return fallback;
}
