import { useState, type FormEvent } from "react";
import { formatTime } from "../lib/dates";
import { uid } from "../lib/id";
import { useApp } from "../state/AppState";

export function DayAgenda({ iso }: { iso: string }) {
  const { group, session, upsertEvent, deleteEvent, language, t } = useApp();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [notes, setNotes] = useState("");
  const events = (group?.events ?? [])
    .filter((event) => event.date === iso)
    .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !session) return;
    upsertEvent({
      id: uid("evt"),
      title: title.trim(),
      date: iso,
      start: start || undefined,
      notes: notes.trim() || undefined,
      memberId: session.profile.id,
    });
    setTitle("");
    setStart("");
    setNotes("");
  };

  const color = (memberId: string) => group?.members.find((member) => member.id === memberId)?.color ?? "#c45c26";
  const who = (memberId: string) => group?.members.find((member) => member.id === memberId)?.name ?? t("someone");

  return (
    <>
      {events.length === 0 ? (
        <p className="empty">{t("nothingOnThisDay")}</p>
      ) : (
        <div className="event-list">
          {events.map((event) => (
            <div className="event-row" key={event.id}>
              <i style={{ background: color(event.memberId) }} />
              <div>
                <strong>{event.title}</strong>
                <div className="meta">
                  {event.start ? formatTime(event.start, language) : t("allDay")}
                  {event.end ? ` – ${formatTime(event.end, language)}` : ""}
                  {` · ${who(event.memberId)}`}
                </div>
                {event.notes ? <div className="meta">{event.notes}</div> : null}
              </div>
              {event.memberId === session?.profile.id ? (
                <button className="btn ghost" onClick={() => deleteEvent(event.id)}>
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
        <div className="row">
          <label className="field" style={{ flex: 1 }}>
            <span>{t("time")}</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 2 }}>
            <span>{t("note")}</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("optional")} />
          </label>
        </div>
        <button className="btn" type="submit">
          {t("addEvent")}
        </button>
      </form>
    </>
  );
}
