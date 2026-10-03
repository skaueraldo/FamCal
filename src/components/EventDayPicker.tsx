import { uniqueDates } from "../lib/events";
import { localeTag } from "../lib/i18n";
import { addDays, formatDayShort, isToday, isoWeek, parseISODate, toISODate } from "../lib/dates";
import { useApp } from "../state/AppState";

const WINDOW_DAYS = 30;

export function EventDayPicker({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  const { language, t } = useApp();
  const today = toISODate(new Date());
  const picked = uniqueDates(selected);
  const window = Array.from({ length: WINDOW_DAYS }, (_, index) => toISODate(addDays(parseISODate(today), index)));
  const inWindow = new Set(window);
  const extras = picked.filter((iso) => !inWindow.has(iso));

  const weeks: { key: string; week: number; days: string[] }[] = [];
  for (const iso of window) {
    const week = isoWeek(parseISODate(iso));
    const current = weeks.at(-1);
    if (current && current.week === week) current.days.push(iso);
    else weeks.push({ key: iso, week, days: [iso] });
  }

  const toggle = (iso: string) => {
    if (picked.includes(iso)) {
      if (picked.length === 1) return;
      onChange(picked.filter((day) => day !== iso));
      return;
    }
    onChange(uniqueDates([...picked, iso]));
  };

  const renderDay = (iso: string, extra = false) => {
    const on = picked.includes(iso);
    const stamp = parseISODate(iso);
    const todayCell = isToday(iso);
    const label = todayCell ? `${formatDayShort(iso, language)}, ${t("today")}` : formatDayShort(iso, language);
    return (
      <button
        key={iso}
        type="button"
        className={`event-day-cell${on ? " selected" : ""}${todayCell ? " today" : ""}${extra ? " extra" : ""}`}
        aria-pressed={on}
        aria-label={label}
        onClick={() => toggle(iso)}
      >
        <span className="event-day-dow">
          {stamp.toLocaleDateString(localeTag(language), { weekday: "short" })}
        </span>
        <span className="event-day-num">{stamp.getDate()}</span>
        {todayCell ? <span className="event-day-today">{t("today")}</span> : null}
      </button>
    );
  };

  return (
    <div className="event-days-field">
      <div className="event-days-copy">
        <span>{t("eventDays")}</span>
        <p className="meta">{t("eventDaysHint")}</p>
      </div>
      {extras.length ? <div className="event-days-extra">{extras.map((iso) => renderDay(iso, true))}</div> : null}
      <div className="event-days">
        {weeks.map((row) => (
          <div className="event-days-week" key={row.key}>
            <div className="event-days-week-label">{t("weekOfYear", { n: row.week })}</div>
            <div className="event-days-row">
              {row.days.map((iso) => renderDay(iso))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
