import { useEffect, useMemo, useState } from "react";
import { addDays, formatDayShort, startOfWeek, toISODate, weekdayNames } from "../lib/dates";
import { uid } from "../lib/id";
import { ingredientsForDinners, ingredientsForDish, ingredientsForRecipes, recipeById, recipesForMenu, type WeekMenu } from "../lib/menus";
import { useApp } from "../state/AppState";
import type { Dinner, FavoriteIngredient, FavoriteRecipe } from "../types";
import { MenuSuggest } from "./MenuSuggest";
import { NotifyToggle } from "./NotifyToggle";

type Draft = { title: string; notes: string };

function draftKey(weekStart: string, weekday: number) {
  return `${weekStart}:${weekday}`;
}

function shopNotice(
  added: number,
  skipped: number,
  t: (key: "addedIngredients" | "addedIngredientsPartial" | "ingredientsAlready", vars?: Record<string, string | number>) => string,
) {
  if (added <= 0) return t("ingredientsAlready");
  if (skipped > 0) return t("addedIngredientsPartial", { n: added });
  return t("addedIngredients", { n: added });
}

export function DinnerView() {
  const { group, session, language, t, upsertDinner, deleteDinner, addShopItems, upsertFavorite, deleteFavorite } = useApp();
  const [now, setNow] = useState(() => new Date());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [notice, setNotice] = useState<string | null>(null);
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
    const linked = dinner?.recipeId ? recipeById(dinner.recipeId) : undefined;
    const favorite = dinner?.recipeId ? (group?.favorites ?? []).find((item) => item.id === dinner.recipeId) : undefined;
    const stillLinked = linked
      ? [linked.title.en, linked.title.no].some((label) => label.toLocaleLowerCase() === title.toLocaleLowerCase())
      : Boolean(favorite && favorite.title.toLocaleLowerCase() === title.toLocaleLowerCase());
    upsertDinner({
      id,
      weekStart,
      weekday,
      title,
      notes: notes || undefined,
      recipeId: stillLinked ? dinner?.recipeId : undefined,
      memberId: session.profile.id,
    });
  };

  const applyMenu = (week: "this" | "next", menu: WeekMenu) => {
    if (!session) return;
    const weekStart = week === "this" ? thisWeekStart : nextWeekStart;
    const dinners = week === "this" ? byWeek.thisWeek : byWeek.nextWeek;
    if (dinners.size > 0 && !window.confirm(t("replaceWeekConfirm"))) return;
    recipesForMenu(menu).forEach((recipe, weekday) => {
      upsertDinner({
        id: `din_${weekStart}_${weekday}`,
        weekStart,
        weekday,
        title: recipe.title[language],
        recipeId: recipe.id,
        memberId: session.profile.id,
      });
    });
    setDrafts((current) => {
      const next = { ...current };
      for (let weekday = 0; weekday < 7; weekday += 1) delete next[draftKey(weekStart, weekday)];
      return next;
    });
    setNotice(t("menuApplied", { name: menu.title[language] }));
  };

  const placeDish = (week: "this" | "next", weekday: number, dish: { id: string; title: string }) => {
    if (!session) return;
    const weekStart = week === "this" ? thisWeekStart : nextWeekStart;
    upsertDinner({
      id: `din_${weekStart}_${weekday}`,
      weekStart,
      weekday,
      title: dish.title,
      recipeId: dish.id,
      memberId: session.profile.id,
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[draftKey(weekStart, weekday)];
      return next;
    });
    setNotice(t("dishPlaced", { name: dish.title, day: names[weekday] }));
  };

  const saveFavorite = (draft: { title: string; notes: string; ingredients: FavoriteIngredient[] }) => {
    if (!session) return;
    const title = draft.title.trim();
    if (!title) return;
    const recipe: FavoriteRecipe = {
      id: uid("fav"),
      title,
      notes: draft.notes.trim() || undefined,
      ingredients: draft.ingredients,
      memberId: session.profile.id,
      createdAt: Date.now(),
    };
    upsertFavorite(recipe);
    setNotice(t("favoriteSaved", { name: title }));
  };

  const shopLines = (lines: { name: string }[]) => {
    if (!lines.length) {
      setNotice(t("noDishIngredients"));
      return;
    }
    const { added, skipped } = addShopItems(lines);
    setNotice(shopNotice(added, skipped, t));
  };

  const shopMenu = (menu: WeekMenu) => {
    shopLines(ingredientsForRecipes(recipesForMenu(menu), language));
  };

  const shopDish = (dish: { id: string; title: string }) => {
    shopLines(ingredientsForDish(dish.id, dish.title, language, group?.favorites ?? []));
  };

  const shopWeek = (dinners: Map<number, Dinner>, skipPast: boolean) => {
    const lines = ingredientsForDinners([...dinners.values()], language, skipPast ? today : undefined, group?.favorites ?? []);
    if (!lines.length) {
      setNotice(t("noWeekIngredients"));
      return;
    }
    const { added, skipped } = addShopItems(lines);
    setNotice(shopNotice(added, skipped, t));
  };

  const renderWeek = (weekStart: string, origin: Date, dinners: Map<number, Dinner>, heading: string, dimPast: boolean) => (
    <details className="card dinner-week collapse-section" open>
      <summary>
        <h2>{heading}</h2>
      </summary>
      <div className="collapse-section-body">
      <div className="meta" style={{ marginBottom: 10 }}>
        {t("weekRange", {
          start: formatDayShort(weekStart, language),
          end: formatDayShort(toISODate(addDays(origin, 6)), language),
        })}
      </div>
      <div className="dinner-week-tools">
        <button className="btn secondary small" type="button" onClick={() => shopWeek(dinners, dimPast)}>
          {t("addWeekIngredients")}
        </button>
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
                {dinner && ingredientsForDinners([dinner], language, undefined, group?.favorites ?? []).length > 0 ? (
                  <button
                    className="btn ghost small"
                    type="button"
                    aria-label={t("addDishIngredientsLabel", { name: dinner.title })}
                    onClick={() => shopLines(ingredientsForDinners([dinner], language, undefined, group?.favorites ?? []))}
                  >
                    {t("addDishIngredients")}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </details>
  );

  return (
    <section className="main panel">
      <div className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">{t("dinnerEyebrow")}</div>
          <h2>{t("dinnerTitle")}</h2>
        </div>
        <NotifyToggle channel="dinner" />
      </div>

      <MenuSuggest
        notice={notice}
        favorites={group?.favorites ?? []}
        onUse={applyMenu}
        onShop={shopMenu}
        onShopDish={shopDish}
        onPlace={placeDish}
        onSaveFavorite={saveFavorite}
        onDeleteFavorite={(id) => {
          if (!window.confirm(t("deleteFavoriteConfirm"))) return;
          deleteFavorite(id);
        }}
      />

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
