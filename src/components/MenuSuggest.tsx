import { useState, type FormEvent } from "react";
import { weekdayNames } from "../lib/dates";
import { FOOD_CATEGORIES, FOOD_CATEGORY_KEY, type FoodCategory } from "../lib/food";
import { recipeById, WEEK_MENUS, type WeekMenu } from "../lib/menus";
import { useApp } from "../state/AppState";
import type { FavoriteIngredient, FavoriteRecipe } from "../types";

interface DishRef {
  id: string;
  title: string;
}

interface MenuSuggestProps {
  notice: string | null;
  favorites: FavoriteRecipe[];
  onUse: (week: "this" | "next", menu: WeekMenu) => void;
  onShop: (menu: WeekMenu) => void;
  onShopDish: (dish: DishRef) => void;
  onPlace: (week: "this" | "next", weekday: number, dish: DishRef) => void;
  onSaveFavorite: (draft: { title: string; notes: string; ingredients: FavoriteIngredient[] }) => void;
  onDeleteFavorite: (id: string) => void;
}

interface IngredientDraft {
  name: string;
  qty: string;
  category: FoodCategory;
}

function emptyIngredient(): IngredientDraft {
  return { name: "", qty: "", category: "other" };
}

export function MenuSuggest({ notice, favorites, onUse, onShop, onShopDish, onPlace, onSaveFavorite, onDeleteFavorite }: MenuSuggestProps) {
  const { language, t } = useApp();
  const days = weekdayNames(language, "short");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([emptyIngredient()]);

  const saveFavorite = (event: FormEvent) => {
    event.preventDefault();
    const cleaned = ingredients
      .map((item) => ({
        name: item.name.trim(),
        qty: item.qty.trim() || undefined,
        category: item.category,
      }))
      .filter((item) => item.name);
    if (!title.trim()) return;
    onSaveFavorite({ title, notes, ingredients: cleaned });
    setTitle("");
    setNotes("");
    setIngredients([emptyIngredient()]);
  };

  return (
    <>
    <details className="card menu-suggest collapse-section" open>
      <summary>
        <h2>{t("favoritesTitle")}</h2>
      </summary>
      <div className="collapse-section-body">
      <p className="lede" style={{ marginTop: 0 }}>
        {t("favoritesLede")}
      </p>
      {notice ? <p className="hint">{notice}</p> : null}
      <form className="favorite-form" onSubmit={saveFavorite}>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("favoriteName")} />
            <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("dinnerNotePlaceholder")} />
            {ingredients.map((item, index) => (
              <div className="favorite-ingredient" key={index}>
                <input
                  value={item.name}
                  placeholder={t("ingredientName")}
                  aria-label={t("ingredientName")}
                  onChange={(event) =>
                    setIngredients((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, name: event.target.value } : row)))
                  }
                />
                <input
                  value={item.qty}
                  placeholder={t("quantity")}
                  aria-label={t("quantity")}
                  onChange={(event) =>
                    setIngredients((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, qty: event.target.value } : row)))
                  }
                />
                <select
                  value={item.category}
                  aria-label={t("ingredientCategory")}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, category: event.target.value as FoodCategory } : row,
                      ),
                    )
                  }
                >
                  {FOOD_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(FOOD_CATEGORY_KEY[category])}
                    </option>
                  ))}
                </select>
                <button
                  className="btn ghost small"
                  type="button"
                  aria-label={t("removeIngredient")}
                  onClick={() =>
                    setIngredients((current) => (current.length === 1 ? [emptyIngredient()] : current.filter((_, rowIndex) => rowIndex !== index)))
                  }
                >
                  {t("remove")}
                </button>
              </div>
            ))}
            <div className="menu-actions">
              <button className="btn secondary small" type="button" onClick={() => setIngredients((current) => [...current, emptyIngredient()])}>
                {t("addFavoriteIngredient")}
              </button>
              <button className="btn small" type="submit">
                {t("saveFavorite")}
              </button>
            </div>
          </form>
          {favorites.length === 0 ? (
            <p className="meta">{t("noFavorites")}</p>
          ) : (
            <ul className="favorite-list">
              {favorites.map((recipe) => (
                <li key={recipe.id}>
                  <div>
                    <strong>{recipe.title}</strong>
                    {recipe.notes ? <div className="meta">{recipe.notes}</div> : null}
                  </div>
                  <div className="menu-actions">
                    {recipe.ingredients.some((item) => item.name.trim()) ? (
                      <button
                        className="btn ghost small"
                        type="button"
                        aria-label={t("addDishIngredientsLabel", { name: recipe.title })}
                        onClick={() => onShopDish({ id: recipe.id, title: recipe.title })}
                      >
                        {t("addDishIngredients")}
                      </button>
                    ) : null}
                    <PlaceDish onPlace={(week, day) => onPlace(week, day, { id: recipe.id, title: recipe.title })} />
                    <button className="btn ghost small" type="button" onClick={() => onDeleteFavorite(recipe.id)}>
                      {t("deleteFavorite")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>
    </details>
    <details className="card collapse-section">
      <summary>
        <h2>{t("dishSuggestions")}</h2>
      </summary>
      <div className="collapse-section-body">
        <p className="lede" style={{ marginTop: 0 }}>
          {t("menuSuggestLede")}
        </p>
        <div className="menu-grid">
          {WEEK_MENUS.map((menu) => (
            <article className="menu-card" key={menu.id}>
              <div>
                <h3>{menu.title[language]}</h3>
                <p className="meta">{menu.blurb[language]}</p>
              </div>
              <ul className="menu-meals">
                {menu.recipeIds.map((id, weekday) => {
                  const recipe = recipeById(id);
                  const meal = recipe?.title[language] ?? "";
                  return (
                    <li key={`${menu.id}-${weekday}`}>
                      <span>{days[weekday]}</span>
                      <strong>{meal}</strong>
                      <div className="menu-meal-actions">
                        <button
                          className="btn ghost small"
                          type="button"
                          aria-label={t("addDishIngredientsLabel", { name: meal })}
                          onClick={() => onShopDish({ id, title: meal })}
                        >
                          {t("addDishIngredients")}
                        </button>
                        <PlaceDish onPlace={(week, day) => onPlace(week, day, { id, title: meal })} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="menu-actions">
                <button className="btn small" type="button" onClick={() => onUse("this", menu)}>
                  {t("useThisWeek")}
                </button>
                <button className="btn secondary small" type="button" onClick={() => onUse("next", menu)}>
                  {t("useNextWeek")}
                </button>
                <button className="btn secondary small" type="button" onClick={() => onShop(menu)}>
                  {t("addMenuIngredients")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </details>
    </>
  );
}

function PlaceDish({ onPlace }: { onPlace: (week: "this" | "next", weekday: number) => void }) {
  const { language, t } = useApp();
  const days = weekdayNames(language, "long");
  return (
    <select
      className="place-dish"
      aria-label={t("placeDish")}
      value=""
      onChange={(event) => {
        const [week, day] = event.target.value.split(":");
        if ((week !== "this" && week !== "next") || day === undefined) return;
        onPlace(week, Number(day));
      }}
    >
      <option value="">{t("placeDish")}</option>
      <optgroup label={t("thisWeek")}>
        {days.map((name, weekday) => (
          <option key={`this-${weekday}`} value={`this:${weekday}`}>
            {name}
          </option>
        ))}
      </optgroup>
      <optgroup label={t("nextWeek")}>
        {days.map((name, weekday) => (
          <option key={`next-${weekday}`} value={`next:${weekday}`}>
            {name}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
