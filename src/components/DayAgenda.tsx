import { useRef, useState, type FormEvent } from "react";
import { eventDates, formatOccurrenceWhen, memberColorOf, occurrencesOnDay, uniqueDates } from "../lib/events";
import { uid } from "../lib/id";
import type { CalEvent, RepeatRule } from "../types";
import { useApp } from "../state/AppState";
import { EventDayPicker } from "./EventDayPicker";
import { MemberName } from "./MemberName";
import { MemberSelect } from "./MemberSelect";

const emptyForm = (iso: string, memberId = "") => ({
  title: "",
  days: [iso],
  start: "",
  end: "",
  repeat: "none" as RepeatRule | "none",
  repeatUntil: "",
  notes: "",
  memberId,
});

export function DayAgenda({ iso, isToday = false }: { iso: string; isToday?: boolean }) {
  const { group, session, upsertEvent, deleteEvent, language, t } = useApp();
  const formRef = useRef<HTMLFormElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<string[]>([iso]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [repeat, setRepeat] = useState<RepeatRule | "none">("none");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [memberId, setMemberId] = useState(session?.profile.id ?? "");
  const events = occurrencesOnDay(group?.events ?? [], iso);
  const members = group?.members ?? [];
  const isAdmin = Boolean(members.find((member) => member.id === session?.profile.id)?.admin);
  const memberColor = (id: string) => memberColorOf(members, id);
  const canChange = (event: CalEvent) => Boolean(session && !event.sourceId);
  const canRemove = (event: CalEvent) =>
    Boolean(session && !event.sourceId && (event.memberId === session.profile.id || isAdmin));

  const applyForm = (next: ReturnType<typeof emptyForm>) => {
    const picked = uniqueDates(next.days);
    setTitle(next.title);
    setDays(picked.length ? picked : [iso]);
    setStart(next.start);
    setEnd(next.end);
    setRepeat(next.repeat);
    setRepeatUntil(next.repeatUntil);
    setNotes(next.notes);
    setMemberId(next.memberId || session?.profile.id || "");
  };

  const resetForm = () => {
    setEditingId(null);
    applyForm(emptyForm(iso, session?.profile.id ?? ""));
  };

  const beginEdit = (event: CalEvent) => {
    setEditingId(event.id);
    applyForm({
      title: event.title,
      days: eventDates(event),
      start: event.start ?? "",
      end: event.end ?? "",
      repeat: event.repeat ?? "none",
      repeatUntil: event.repeatUntil ?? "",
      notes: event.notes ?? "",
      memberId: event.memberId,
    });
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !session) return;
    const picked = uniqueDates(days);
    if (!picked.length) return;
    const existing = editingId ? group?.events.find((item) => item.id === editingId) : undefined;
    if (editingId && (!existing || !canChange(existing))) return;
    upsertEvent({
      id: existing?.id ?? uid("evt"),
      title: title.trim(),
      date: picked[0],
      ...(picked.length > 1 ? { dates: picked } : {}),
      start: start || undefined,
      end: end || undefined,
      notes: notes.trim() || undefined,
      memberId: members.some((member) => member.id === memberId) ? memberId : session.profile.id,
      repeat: repeat === "none" ? undefined : repeat,
      repeatUntil: repeat === "none" ? undefined : repeatUntil || undefined,
    });
    resetForm();
  };

  return (
    <div className="day-agenda-stack">
      <div className={`card day-events${isToday ? " today" : ""}`}>
        <h2>{t("eventsOnThisDay")}</h2>
        {events.length === 0 ? (
          <p className="empty">{t(isToday ? "nothingTodayYet" : "nothingOnThisDay")}</p>
        ) : (
          <div className="event-list">
            {events.map((occ) => {
              const editable = canChange(occ.event);
              return (
                <div
                  className={`event-row${editable ? " editable" : ""}${editingId === occ.event.id ? " editing" : ""}`}
                  key={`${occ.event.id}:${occ.startDate}:${occ.iso}`}
                  onClick={editable ? () => beginEdit(occ.event) : undefined}
                >
                  <i style={{ background: memberColor(occ.event.memberId) }} />
                  <div>
                    <strong>{occ.event.title}</strong>
                    <div className="meta event-who">
                      {formatOccurrenceWhen(occ, language, {
                        allDay: t("allDay"),
                        daily: t("repeatDaily"),
                        weekly: t("repeatWeekly"),
                        monthly: t("repeatMonthly"),
                        yearly: t("repeatYearly"),
                        daysCount: t("eventDaysCount", { n: eventDates(occ.event).length }),
                      })}
                      <MemberName memberId={occ.event.memberId} members={members} groupCode={group?.code} fallbackName={t("someone")} />
                    </div>
                    {occ.event.notes ? <div className="meta">{occ.event.notes}</div> : null}
                  </div>
                  {editable ? (
                    <div className="event-row-actions" onClick={(click) => click.stopPropagation()}>
                      <button className="btn ghost small" type="button" onClick={() => beginEdit(occ.event)}>
                        {t("editEvent")}
                      </button>
                      {canRemove(occ.event) ? (
                        <button
                          className="btn ghost small"
                          type="button"
                          title={occ.event.repeat ? t("removeSeriesHint") : undefined}
                          onClick={() => {
                            if (editingId === occ.event.id) resetForm();
                            deleteEvent(occ.event.id);
                          }}
                        >
                          {t("remove")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form ref={formRef} className={`card day-compose${editingId ? " editing" : ""}`} onSubmit={save}>
        <h2>{editingId ? t("editEventTitle") : t("addToSharedCalendar")}</h2>
        <label className="field">
          <span>{t("eventTitle")}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("eventPlaceholder")} />
        </label>
        <EventDayPicker selected={days} onChange={setDays} />
        <div className="when-grid">
          <label className="field">
            <span>{t("fromTime")}</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
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
              <input type="date" value={repeatUntil} min={uniqueDates(days)[0] || iso} onChange={(e) => setRepeatUntil(e.target.value)} />
            </label>
          )}
        </div>
        {editingId && repeat !== "none" ? <p className="meta edit-series-hint">{t("editSeriesHint")}</p> : null}
        {members.length ? (
          <label className="field">
            <span>{t("assignTo")}</span>
            <MemberSelect value={memberId || session?.profile.id || ""} onChange={setMemberId} members={members} label={t("assignTo")} />
          </label>
        ) : null}
        <label className="field">
          <span>{t("note")}</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("optional")} />
        </label>
        <div className="event-form-actions">
          <button className="btn" type="submit">
            {editingId ? t("saveEvent") : t("addEvent")}
          </button>
          {editingId ? (
            <button className="btn secondary" type="button" onClick={resetForm}>
              {t("cancelEdit")}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
