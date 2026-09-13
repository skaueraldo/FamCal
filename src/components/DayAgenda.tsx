import { useState, type FormEvent } from "react";
import { EVENT_COLORS, eventColor, formatOccurrenceWhen, occurrencesOnDay } from "../lib/events";
import { uid } from "../lib/id";
import type { RepeatRule } from "../types";
import { useApp } from "../state/AppState";

export function DayAgenda({ iso }: { iso: string }) {
  const { group, session, upsertEvent, deleteEvent, language, t } = useApp();
  const [title, setTitle] = useState("");
  const [fromDate, setFromDate] = useState(iso);
  const [toDate, setToDate] = useState(iso);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [repeat, setRepeat] = useState<RepeatRule | "none">("none");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const events = occurrencesOnDay(group?.events ?? [], iso);
  const memberColor = (memberId: string) => group?.members.find((member) => member.id === memberId)?.color ?? "#c45c26";
  const who = (memberId: string) => group?.members.find((member) => member.id === memberId)?.name ?? t("someone");

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !session || !fromDate) return;
    const untilDate = toDate && toDate >= fromDate ? toDate : fromDate;
    upsertEvent({
      id: uid("evt"),
      title: title.trim(),
      date: fromDate,
      endDate: untilDate !== fromDate ? untilDate : undefined,
      start: start || undefined,
      end: end || undefined,
      notes: notes.trim() || undefined,
      memberId: session.profile.id,
      color: color || undefined,
      repeat: repeat === "none" ? undefined : repeat,
      repeatUntil: repeat === "none" ? undefined : repeatUntil || undefined,
    });
    setTitle("");
    setFromDate(iso);
    setToDate(iso);
    setStart("");
    setEnd("");
    setRepeat("none");
    setRepeatUntil("");
    setColor("");
    setNotes("");
  };

  const onFromDate = (value: string) => {
    setFromDate(value);
    if (!toDate || toDate < value) setToDate(value);
  };

  return (
    <>
      {events.length === 0 ? (
        <p className="empty">{t("nothingOnThisDay")}</p>
      ) : (
        <div className="event-list">
          {events.map((occ) => (
            <div className="event-row" key={`${occ.event.id}:${occ.startDate}:${occ.iso}`}>
              <i style={{ background: eventColor(occ.event, memberColor(occ.event.memberId)) }} />
              <div>
                <strong>{occ.event.title}</strong>
                <div className="meta">
                  {formatOccurrenceWhen(occ, language, {
                    allDay: t("allDay"),
                    daily: t("repeatDaily"),
                    weekly: t("repeatWeekly"),
                    monthly: t("repeatMonthly"),
                    yearly: t("repeatYearly"),
                  })}
                  {` · ${who(occ.event.memberId)}`}
                </div>
                {occ.event.notes ? <div className="meta">{occ.event.notes}</div> : null}
              </div>
              {occ.event.memberId === session?.profile.id && !occ.event.sourceId ? (
                <button
                  className="btn ghost"
                  title={occ.event.repeat ? t("removeSeriesHint") : undefined}
                  onClick={() => deleteEvent(occ.event.id)}
                >
                  {t("remove")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add}>
        <label className="field">
          <span>{t("addToSharedCalendar")}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("eventPlaceholder")} />
        </label>
        <div className="when-grid">
          <label className="field">
            <span>{t("fromDate")}</span>
            <input type="date" value={fromDate} onChange={(e) => onFromDate(e.target.value)} required />
          </label>
          <label className="field">
            <span>{t("fromTime")}</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>{t("toDate")}</span>
            <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} required />
          </label>
          <label className="field">
            <span>{t("toTime")}</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <div className="when-grid">
          <label className="field">
            <span>{t("repeats")}</span>
            <select value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatRule | "none")}>
              <option value="none">{t("repeatNone")}</option>
              <option value="daily">{t("repeatDaily")}</option>
              <option value="weekly">{t("repeatWeekly")}</option>
              <option value="monthly">{t("repeatMonthly")}</option>
              <option value="yearly">{t("repeatYearly")}</option>
            </select>
          </label>
          {repeat === "none" ? (
            <div />
          ) : (
            <label className="field">
              <span>{t("repeatUntil")}</span>
              <input type="date" value={repeatUntil} min={fromDate} onChange={(e) => setRepeatUntil(e.target.value)} />
            </label>
          )}
        </div>
        <div className="field">
          <span>{t("eventColor")}</span>
          <div className="color-picks" role="group" aria-label={t("eventColor")}>
            <button
              type="button"
              className={`color-pick auto${color === "" ? " active" : ""}`}
              aria-label={t("colorAutomatic")}
              aria-pressed={color === ""}
              onClick={() => setColor("")}
            />
            {EVENT_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`color-pick${color === swatch ? " active" : ""}`}
                style={{ background: swatch }}
                aria-label={swatch}
                aria-pressed={color === swatch}
                onClick={() => setColor(swatch)}
              />
            ))}
          </div>
        </div>
        <label className="field">
          <span>{t("note")}</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("optional")} />
        </label>
        <button className="btn" type="submit">
          {t("addEvent")}
        </button>
      </form>
    </>
  );
}
