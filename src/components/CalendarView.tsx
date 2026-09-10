import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  buildWeekDays,
  formatDayLong,
  formatDayShort,
  formatTime,
  isPast,
  isoWeek,
  monthLabel,
  parseISODate,
  startOfWeek,
  toISODate,
} from "../lib/dates";
import { useApp } from "../state/AppState";
import type { CalEvent } from "../types";
import { DayAgenda } from "./DayAgenda";
import { NotifyToggle } from "./NotifyToggle";

type CalView = "day" | "tomorrow" | "week" | "month";

const VIEWS: CalView[] = ["day", "tomorrow", "week", "month"];

export function CalendarView() {
  const now = new Date();
  const todayIso = toISODate(now);
  const tomorrowIso = toISODate(addDays(now, 1));
  const [view, setView] = useState<CalView>("day");
  const [focus, setFocus] = useState(todayIso);
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { group, language, t } = useApp();

  const weeks = useMemo(() => buildMonthGrid(cursor.year, cursor.month, language), [cursor, language]);
  const weekOrigin = startOfWeek(parseISODate(focus));
  const weekDays = useMemo(() => buildWeekDays(startOfWeek(parseISODate(focus)), language), [focus, language]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const event of group?.events ?? []) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    }
    return map;
  }, [group?.events]);

  const memberColor = (memberId: string) =>
    group?.members.find((member) => member.id === memberId)?.color ?? "#c45c26";

  const pickView = (next: CalView) => {
    if (next === "day") setFocus(todayIso);
    if (next === "tomorrow") setFocus(tomorrowIso);
    if (next === "week" && view === "month") {
      const sameMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();
      setFocus(sameMonth ? todayIso : toISODate(new Date(cursor.year, cursor.month, 1)));
    }
    if (next === "month") {
      const date = parseISODate(focus);
      setCursor({ year: date.getFullYear(), month: date.getMonth() });
    }
    setView(next);
  };

  const openDay = (iso: string) => {
    setFocus(iso);
    setView(iso === tomorrowIso ? "tomorrow" : "day");
  };

  const goToday = () => {
    setFocus(todayIso);
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    if (view === "tomorrow") setView("day");
  };

  const step = (delta: number) => {
    if (view === "month") {
      setCursor((current) => addMonths(current.year, current.month, delta));
      return;
    }
    if (view === "week") {
      setFocus(toISODate(addDays(parseISODate(focus), delta * 7)));
      return;
    }
    const next = toISODate(addDays(parseISODate(focus), delta));
    setFocus(next);
    if (view === "tomorrow") setView("day");
  };

  const prevLabel = view === "month" ? t("previousMonth") : view === "week" ? t("previousWeek") : t("previousDay");
  const nextLabel = view === "month" ? t("nextMonth") : view === "week" ? t("nextWeek") : t("nextDay");

  const heading =
    view === "month"
      ? monthLabel(cursor.year, cursor.month, language)
      : view === "week"
        ? t("weekOfYear", { n: isoWeek(weekOrigin) })
        : formatDayLong(focus, language);

  const eyebrow =
    view === "month"
      ? group?.name || t("householdMonth")
      : view === "week"
        ? t("weekRange", {
            start: formatDayShort(weekDays[0]?.iso ?? focus, language),
            end: formatDayShort(weekDays[6]?.iso ?? focus, language),
          })
        : view === "tomorrow" && focus === tomorrowIso
          ? t("viewTomorrow")
          : t("weekOfYear", { n: isoWeek(parseISODate(focus)) });

  return (
    <section className="main">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{heading}</h1>
        </div>
        <div className="topbar-tools">
          <div className="month-nav">
            <button className="icon-btn" aria-label={prevLabel} onClick={() => step(-1)}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn secondary" onClick={goToday}>
              {t("today")}
            </button>
            <button className="icon-btn" aria-label={nextLabel} onClick={() => step(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
          <NotifyToggle channel="calendar" />
        </div>
      </div>

      <div className="view-switch" role="tablist" aria-label={t("calendarView")}>
        {VIEWS.map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={view === item}
            className={view === item ? "active" : ""}
            onClick={() => pickView(item)}
          >
            {t(
              item === "day"
                ? "viewDay"
                : item === "tomorrow"
                  ? "viewTomorrow"
                  : item === "week"
                    ? "viewWeek"
                    : "viewMonth",
            )}
          </button>
        ))}
      </div>

      {view === "day" || view === "tomorrow" ? (
        <div className={`card day-agenda${focus === todayIso ? " today" : ""}`}>
          <DayAgenda key={focus} iso={focus} />
        </div>
      ) : null}

      {view === "week" ? (
        <div className="week-agenda">
          {weekDays.map((day) => {
            const events = eventsByDay.get(day.iso) ?? [];
            return (
              <button
                key={day.iso}
                className={`week-agenda-day${day.iso === todayIso ? " today" : ""}${isPast(day.iso) ? " past" : ""}`}
                onClick={() => openDay(day.iso)}
              >
                <div className="week-agenda-head">
                  <strong>{day.weekday}</strong>
                  <span className="meta">{formatDayShort(day.iso, language)}</span>
                </div>
                <div className="chips">
                  {events.length === 0 ? <span className="meta">{t("noEventsShort")}</span> : null}
                  {events.map((event) => (
                    <span key={event.id} className="chip" style={{ background: memberColor(event.memberId) }}>
                      {event.start ? `${formatTime(event.start, language)} ` : ""}
                      {event.title}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "month" ? (
        <div className="month-sheet">
          <div className="week-head">
            <div className="week-label">
              <span>{t("week")}</span>
            </div>
            {weeks[0]?.days.map((day) => (
              <div className="weekday-head" key={day.weekday}>
                {day.weekdayShort}
              </div>
            ))}
          </div>
          {weeks.map((week) => (
            <div className="week-row" key={week.week}>
              <div className="week-label">
                <span>{t("week")}</span>
                <b>{week.week}</b>
                <span>{t("ofYear")}</span>
              </div>
              {week.days.map((day) => {
                const events = eventsByDay.get(day.iso) ?? [];
                const shown = events.slice(0, 3);
                return (
                  <button
                    key={day.iso}
                    className={`day-cell${day.inMonth ? "" : " out"}${day.iso === todayIso ? " today" : ""}${isPast(day.iso) ? " past" : ""}`}
                    onClick={() => openDay(day.iso)}
                  >
                    <span className="dow">{day.weekdayShort}</span>
                    <span className="num">{day.date.getDate()}</span>
                    <div className="chips">
                      {shown.map((event) => (
                        <span key={event.id} className="chip" style={{ background: memberColor(event.memberId) }}>
                          {event.start ? `${formatTime(event.start, language)} ` : ""}
                          {event.title}
                        </span>
                      ))}
                      {events.length > 3 ? <span className="more">{t("moreEvents", { n: events.length - 3 })}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
