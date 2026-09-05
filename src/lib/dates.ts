import { localeTag, type Lang } from "./i18n";

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function startOfWeek(date = new Date()): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - mondayIndex(start));
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isoWeek(date: Date): number {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function isPast(iso: string): boolean {
  return iso < toISODate(new Date());
}

export function weekdayNames(lang: Lang, width: "long" | "short"): string[] {
  const fmt = new Intl.DateTimeFormat(localeTag(lang), { weekday: width });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
}

export function monthLabel(year: number, month: number, lang: Lang): string {
  return new Date(year, month, 1).toLocaleDateString(localeTag(lang), {
    month: "long",
    year: "numeric",
  });
}

export function formatDayShort(iso: string, lang: Lang): string {
  return parseISODate(iso).toLocaleDateString(localeTag(lang), {
    day: "numeric",
    month: "short",
  });
}

export function formatDayLong(iso: string, lang: Lang): string {
  return parseISODate(iso).toLocaleDateString(localeTag(lang), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatWhen(stamp: number, lang: Lang): string {
  return new Date(stamp).toLocaleString(localeTag(lang));
}

export function isToday(iso: string): boolean {
  return iso === toISODate(new Date());
}

export function sameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

export interface MonthCell {
  date: Date;
  iso: string;
  inMonth: boolean;
  weekday: string;
  weekdayShort: string;
  week: number;
}

export interface MonthWeek {
  week: number;
  days: MonthCell[];
}

export function buildMonthGrid(year: number, month: number, lang: Lang): MonthWeek[] {
  const long = weekdayNames(lang, "long");
  const short = weekdayNames(lang, "short");
  const first = startOfMonth(year, month);
  const gridStart = new Date(first);
  gridStart.setDate(1 - mondayIndex(first));

  const weeks: MonthWeek[] = [];
  const cursor = new Date(gridStart);

  for (let w = 0; w < 6; w++) {
    const days: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor);
      const inMonth = sameMonth(date, year, month);
      days.push({
        date,
        iso: toISODate(date),
        inMonth,
        weekday: long[d],
        weekdayShort: short[d],
        week: isoWeek(date),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    const hasMonthDay = days.some((day) => day.inMonth);
    if (hasMonthDay) {
      const week = days[3]?.week ?? days.find((day) => day.inMonth)?.week ?? w + 1;
      weeks.push({ week, days: days.map((day) => ({ ...day, week })) });
    }
  }
  return weeks;
}

export function buildWeekDays(origin: Date, lang: Lang): MonthCell[] {
  const long = weekdayNames(lang, "long");
  const short = weekdayNames(lang, "short");
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(origin, index);
    return {
      date,
      iso: toISODate(date),
      inMonth: true,
      weekday: long[index],
      weekdayShort: short[index],
      week: isoWeek(date),
    };
  });
}

export function formatTime(hhmm?: string, lang?: Lang): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString(lang ? localeTag(lang) : undefined, { hour: "numeric", minute: "2-digit" });
}
