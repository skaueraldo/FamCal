import { useEffect, useMemo, useState } from "react";
import { addDays, formatDayShort, startOfWeek, toISODate, weekdayNames } from "../lib/dates";
import { useApp } from "../state/AppState";
import type { Dinner } from "../types";
import { NotifyToggle } from "./NotifyToggle";

type Draft = { title: string; notes: string };

function draftKey(weekStart: string, weekday: number) {
  return `${weekStart}:${weekday}`;
}

export function DinnerView() {
  const { group, session, language, t, upsertDinner, deleteDinner } = useApp();
  const [now, setNow] = useState(() => new Date());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const names = weekdayNames(language, "long");
  const today = toISODate(now);
  const thisOrigin = startOfWeek(now);
  const nextOrigin = addDays(thisOrigin, 7);
  const thisWeekStart = toISODate(thisOrigin);
  const nextWeekStart = toISODate(nextOrigin);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 60_000);
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const byWeek = useMemo(() => {
    const thisWeek = new Map<number, Dinner>();
    const nextWeek = new Map<number, Dinner>();
    for (const dinner of group?.dinners ?? []) {
      if (dinner.weekStart === thisWeekStart) thisWeek.set(dinner.weekday, dinner);
      if (dinner.weekStart === nextWeekStart) nextWeek.set(dinner.weekday, dinner);
    }
    return { thisWeek, nextWeek };
  }, [group?.dinners, thisWeekStart, nextWeekStart]);

  const save = (weekStart: string, weekday: number, dinners: Map<number, Dinner>) => {
    if (!session) return;
    const dinner = dinners.get(weekday);
    const draft = drafts[draftKey(weekStart, weekday)];
    const title = (draft?.title ?? dinner?.title ?? "").trim();
    const notes = (draft?.notes ?? dinner?.notes ?? "").trim();
    const id = dinner?.id ?? `din_${weekStart}_${weekday}`;
    if (!title) {
      if (dinner) deleteDinner(id);
      return;
    }
    upsertDinner({
      id,
      weekStart,
      weekday,
      title,
      notes: notes || undefined,
      memberId: session.profile.id,
    });
  };

  const renderWeek = (weekStart: string, origin: Date, dinners: Map<number, Dinner>, heading: string, dimPast: boolean) => (
    <div className="card dinner-week">
      <h2>{heading}</h2>
      <div className="meta" style={{ marginBottom: 14 }}>
        {t("weekRange", {
          start: formatDayShort(weekStart, language),
          end: formatDayShort(toISODate(addDays(origin, 6)), language),
        })}
      </div>
      <div className="dinner-list">
        {names.map((dayName, weekday) => {
          const dinner = dinners.get(weekday);
          const date = toISODate(addDays(origin, weekday));
          const key = draftKey(weekStart, weekday);
          const title = drafts[key]?.title ?? dinner?.title ?? "";
          const notes = drafts[key]?.notes ?? dinner?.notes ?? "";
          const past = dimPast && date < today;
          const isToday = date === today;
          return (
            <div className={`dinner-row${past ? " past" : ""}${isToday ? " today" : ""}`} key={key}>
              <div className="dinner-day">
                <strong>{dayName}</strong>
                <span className="meta">{formatDayShort(date, language)}</span>
              </div>
              <div className="dinner-fields">
                <input
                  value={title}
                  placeholder={t("dinnerPlaceholder")}
                  onChange={(e) =>
                    setDrafts((current) => ({
                      ...current,
                      [key]: { title: e.target.value, notes: current[key]?.notes ?? dinner?.notes ?? "" },
                    }))
                  }
                  onBlur={() => save(weekStart, weekday, dinners)}
                />
                <input
                  value={notes}
                  placeholder={t("dinnerNotePlaceholder")}
                  onChange={(e) =>
                    setDrafts((current) => ({
                      ...current,
                      [key]: { title: current[key]?.title ?? dinner?.title ?? "", notes: e.target.value },
                    }))
                  }
                  onBlur={() => save(weekStart, weekday, dinners)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("dinnerEyebrow")}</div>
          <h1>{t("dinnerTitle")}</h1>
        </div>
        <NotifyToggle channel="dinner" />
      </div>

      <p className="lede" style={{ margin: "0 0 4px" }}>
        {t("dinnerLede")}
      </p>

      <div className="dinner-weeks">
        {renderWeek(thisWeekStart, thisOrigin, byWeek.thisWeek, t("thisWeek"), true)}
        {renderWeek(nextWeekStart, nextOrigin, byWeek.nextWeek, t("nextWeek"), false)}
      </div>
    </section>
  );
}
