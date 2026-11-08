import { addDays, parseISODate, toISODate } from "./dates";
import { FOOD_CATEGORIES, foodCategoryOf, type FoodCategory } from "./food";
import type { Lang } from "./i18n";
import type { Dinner, FavoriteRecipe } from "../types";

export type UnitKey = "g" | "kg" | "dl" | "pcs" | "pack" | "can" | "jar" | "tub" | "bottle" | "cube";

export interface Ingredient {
  name: { en: string; no: string };
  category: FoodCategory;
  amount: number;
  unit: UnitKey;
}

export interface Recipe {
  id: string;
  title: { en: string; no: string };
  ingredients: Ingredient[];
}

export interface WeekMenu {
  id: string;
  title: { en: string; no: string };
  blurb: { en: string; no: string };
  recipeIds: string[];
}

export interface ShopLine {
  name: string;
  qty?: string;
  category: FoodCategory;
}

const UNIT_LABEL: Record<UnitKey, { en: string; no: string }> = {
  g: { en: "g", no: "g" },
  kg: { en: "kg", no: "kg" },
  dl: { en: "dl", no: "dl" },
  pcs: { en: "pcs", no: "stk" },
  pack: { en: "pack", no: "pk" },
  can: { en: "can", no: "boks" },
  jar: { en: "jar", no: "glass" },
  tub: { en: "tub", no: "beger" },
  bottle: { en: "bottle", no: "flaske" },
  cube: { en: "cube", no: "terning" },
};

function ing(en: string, no: string, category: FoodCategory, amount: number, unit: UnitKey): Ingredient {
  return { name: { en, no }, category, amount, unit };
}

const RECIPES: Recipe[] = [
  {
    id: "taco",
    title: { en: "Tacos", no: "Taco" },
    ingredients: [
      ing("Minced meat", "Kjøttdeig", "meat", 400, "g"),
      ing("Taco shells", "Tacolefser", "bakery", 1, "pack"),
      ing("Taco sauce", "Tacosaus", "pantry", 1, "jar"),
      ing("Lettuce", "Salat", "produce", 1, "pcs"),
      ing("Tomato", "Tomat", "produce", 3, "pcs"),
      ing("Sweetcorn", "Mais", "pantry", 1, "can"),
      ing("Sour cream", "Rømme", "dairy", 1, "tub"),
      ing("Cheese", "Ost", "dairy", 200, "g"),
    ],
  },
  {
    id: "bolognese",
    title: { en: "Spaghetti bolognese", no: "Spagetti og kjøttsaus" },
    ingredients: [
      ing("Minced meat", "Kjøttdeig", "meat", 400, "g"),
      ing("Spaghetti", "Spagetti", "pantry", 400, "g"),
      ing("Chopped tomatoes", "Hakkede tomater", "pantry", 2, "can"),
      ing("Onion", "Løk", "produce", 1, "pcs"),
      ing("Carrot", "Gulrot", "produce", 2, "pcs"),
      ing("Cheese", "Ost", "dairy", 100, "g"),
    ],
  },
  {
    id: "salmon-potatoes",
    title: { en: "Salmon and potatoes", no: "Laks med poteter" },
    ingredients: [
      ing("Salmon fillet", "Laksefilet", "fish", 600, "g"),
      ing("Potato", "Potet", "produce", 1, "kg"),
      ing("Broccoli", "Brokkoli", "produce", 1, "pcs"),
      ing("Lemon", "Sitron", "produce", 1, "pcs"),
      ing("Sour cream", "Rømme", "dairy", 1, "tub"),
    ],
  },
  {
    id: "chicken-wok",
    title: { en: "Chicken wok", no: "Kyllingwok" },
    ingredients: [
      ing("Chicken fillet", "Kyllingfilet", "meat", 500, "g"),
      ing("Wok vegetables", "Wokgrønnsaker", "frozen", 1, "pack"),
      ing("Noodles", "Nudler", "pantry", 1, "pack"),
      ing("Soy sauce", "Soyasaus", "pantry", 1, "bottle"),
      ing("Bell pepper", "Paprika", "produce", 2, "pcs"),
    ],
  },
  {
    id: "pizza",
    title: { en: "Pizza", no: "Pizza" },
    ingredients: [
      ing("Pizza dough", "Pizzadeig", "bakery", 2, "pcs"),
      ing("Tomato sauce", "Tomatsaus", "pantry", 1, "jar"),
      ing("Cheese", "Ost", "dairy", 300, "g"),
      ing("Ham", "Skinke", "meat", 150, "g"),
      ing("Bell pepper", "Paprika", "produce", 1, "pcs"),
    ],
  },
  {
    id: "meatballs",
    title: { en: "Meatballs", no: "Kjøttkaker" },
    ingredients: [
      ing("Minced meat", "Kjøttdeig", "meat", 500, "g"),
      ing("Potato", "Potet", "produce", 1, "kg"),
      ing("Onion", "Løk", "produce", 1, "pcs"),
      ing("Milk", "Melk", "dairy", 2, "dl"),
      ing("Gravy", "Brun saus", "pantry", 1, "pack"),
      ing("Peas", "Erter", "frozen", 1, "pack"),
    ],
  },
  {
    id: "stew",
    title: { en: "Beef and vegetable stew", no: "Lapskaus" },
    ingredients: [
      ing("Stewing beef", "Grytekjøtt", "meat", 600, "g"),
      ing("Potato", "Potet", "produce", 800, "g"),
      ing("Carrot", "Gulrot", "produce", 4, "pcs"),
      ing("Swede", "Kålrot", "produce", 1, "pcs"),
      ing("Onion", "Løk", "produce", 1, "pcs"),
      ing("Stock", "Buljong", "pantry", 1, "cube"),
    ],
  },
  {
    id: "cod",
    title: { en: "Cod with carrots", no: "Torsk med gulrøtter" },
    ingredients: [
      ing("Cod fillet", "Torskefilet", "fish", 600, "g"),
      ing("Potato", "Potet", "produce", 1, "kg"),
      ing("Carrot", "Gulrot", "produce", 4, "pcs"),
      ing("Lemon", "Sitron", "produce", 1, "pcs"),
    ],
  },
  {
    id: "salmon-wrap",
    title: { en: "Salmon wraps", no: "Laksewrap" },
    ingredients: [
      ing("Salmon fillet", "Laksefilet", "fish", 400, "g"),
      ing("Tortillas", "Tortillalefser", "bakery", 1, "pack"),
      ing("Lettuce", "Salat", "produce", 1, "pcs"),
      ing("Cucumber", "Agurk", "produce", 1, "pcs"),
      ing("Sour cream", "Rømme", "dairy", 1, "tub"),
    ],
  },
  {
    id: "fish-gratin",
    title: { en: "Fish gratin", no: "Fiskegrateng" },
    ingredients: [
      ing("Cod fillet", "Torskefilet", "fish", 500, "g"),
      ing("Macaroni", "Makaroni", "pantry", 300, "g"),
      ing("Milk", "Melk", "dairy", 5, "dl"),
      ing("Cheese", "Ost", "dairy", 150, "g"),
      ing("Eggs", "Egg", "dairy", 2, "pcs"),
    ],
  },
  {
    id: "shrimp-salad",
    title: { en: "Shrimp salad", no: "Rekesalat" },
    ingredients: [
      ing("Shrimp", "Reker", "fish", 300, "g"),
      ing("Lettuce", "Salat", "produce", 1, "pcs"),
      ing("Eggs", "Egg", "dairy", 2, "pcs"),
      ing("Cucumber", "Agurk", "produce", 1, "pcs"),
      ing("Bread", "Brød", "bakery", 1, "pcs"),
      ing("Mayonnaise", "Majones", "pantry", 1, "jar"),
    ],
  },
  {
    id: "fish-cakes",
    title: { en: "Fish cakes", no: "Fiskekaker" },
    ingredients: [
      ing("Fish cakes", "Fiskekaker", "fish", 8, "pcs"),
      ing("Potato", "Potet", "produce", 1, "kg"),
      ing("Carrot", "Gulrot", "produce", 3, "pcs"),
      ing("Peas", "Erter", "frozen", 1, "pack"),
    ],
  },
  {
    id: "baked-salmon",
    title: { en: "Baked salmon", no: "Ovnsbakt laks" },
    ingredients: [
      ing("Salmon fillet", "Laksefilet", "fish", 600, "g"),
      ing("Potato", "Potet", "produce", 1, "kg"),
      ing("Broccoli", "Brokkoli", "produce", 1, "pcs"),
      ing("Lemon", "Sitron", "produce", 1, "pcs"),
    ],
  },
  {
    id: "fish-soup",
    title: { en: "Fish soup", no: "Fiskesuppe" },
    ingredients: [
      ing("Cod fillet", "Torskefilet", "fish", 400, "g"),
      ing("Shrimp", "Reker", "fish", 200, "g"),
      ing("Potato", "Potet", "produce", 600, "g"),
      ing("Carrot", "Gulrot", "produce", 2, "pcs"),
      ing("Cream", "Fløte", "dairy", 3, "dl"),
      ing("Stock", "Buljong", "pantry", 1, "cube"),
    ],
  },
  {
    id: "omelette",
    title: { en: "Omelette", no: "Omelett" },
    ingredients: [
      ing("Eggs", "Egg", "dairy", 8, "pcs"),
      ing("Cheese", "Ost", "dairy", 150, "g"),
      ing("Ham", "Skinke", "meat", 100, "g"),
      ing("Bell pepper", "Paprika", "produce", 1, "pcs"),
      ing("Bread", "Brød", "bakery", 1, "pcs"),
    ],
  },
  {
    id: "sausage-pasta",
    title: { en: "Sausage pasta", no: "Pølse og pasta" },
    ingredients: [
      ing("Sausages", "Pølser", "meat", 400, "g"),
      ing("Pasta", "Pasta", "pantry", 400, "g"),
      ing("Cream", "Fløte", "dairy", 3, "dl"),
      ing("Onion", "Løk", "produce", 1, "pcs"),
      ing("Cheese", "Ost", "dairy", 100, "g"),
    ],
  },
  {
    id: "quesadilla",
    title: { en: "Quesadilla", no: "Quesadilla" },
    ingredients: [
      ing("Tortillas", "Tortillalefser", "bakery", 1, "pack"),
      ing("Cheese", "Ost", "dairy", 200, "g"),
      ing("Chicken fillet", "Kyllingfilet", "meat", 300, "g"),
      ing("Bell pepper", "Paprika", "produce", 1, "pcs"),
      ing("Sweetcorn", "Mais", "pantry", 1, "can"),
    ],
  },
  {
    id: "noodle-soup",
    title: { en: "Noodle soup", no: "Nudelsuppe" },
    ingredients: [
      ing("Noodles", "Nudler", "pantry", 2, "pack"),
      ing("Chicken fillet", "Kyllingfilet", "meat", 300, "g"),
      ing("Wok vegetables", "Wokgrønnsaker", "frozen", 1, "pack"),
      ing("Stock", "Buljong", "pantry", 2, "cube"),
      ing("Soy sauce", "Soyasaus", "pantry", 1, "bottle"),
    ],
  },
  {
    id: "hash",
    title: { en: "Potato hash", no: "Pytt i panne" },
    ingredients: [
      ing("Sausages", "Pølser", "meat", 400, "g"),
      ing("Potato", "Potet", "produce", 800, "g"),
      ing("Onion", "Løk", "produce", 1, "pcs"),
      ing("Eggs", "Egg", "dairy", 4, "pcs"),
    ],
  },
  {
    id: "burgers",
    title: { en: "Burgers", no: "Hamburgere" },
    ingredients: [
      ing("Burger mince", "Karbonadedeig", "meat", 400, "g"),
      ing("Burger buns", "Hamburgerbrød", "bakery", 4, "pcs"),
      ing("Lettuce", "Salat", "produce", 1, "pcs"),
      ing("Tomato", "Tomat", "produce", 2, "pcs"),
      ing("Cheese", "Ost", "dairy", 100, "g"),
      ing("Fries", "Pommes frites", "frozen", 1, "pack"),
    ],
  },
  {
    id: "tomato-soup",
    title: { en: "Tomato soup", no: "Tomatsuppe" },
    ingredients: [
      ing("Chopped tomatoes", "Hakkede tomater", "pantry", 2, "can"),
      ing("Milk", "Melk", "dairy", 3, "dl"),
      ing("Onion", "Løk", "produce", 1, "pcs"),
      ing("Carrot", "Gulrot", "produce", 1, "pcs"),
      ing("Bread", "Brød", "bakery", 1, "pcs"),
    ],
  },
  {
    id: "meatballs-cabbage",
    title: { en: "Meatballs with cabbage", no: "Kjøttkaker med kålstuing" },
    ingredients: [
      ing("Minced meat", "Kjøttdeig", "meat", 500, "g"),
      ing("Potato", "Potet", "produce", 1, "kg"),
      ing("Cabbage", "Hodekål", "produce", 1, "pcs"),
      ing("Milk", "Melk", "dairy", 2, "dl"),
      ing("Onion", "Løk", "produce", 1, "pcs"),
      ing("Gravy", "Brun saus", "pantry", 1, "pack"),
    ],
  },
  {
    id: "fish-balls",
    title: { en: "Fish balls", no: "Fiskeboller i hvit saus" },
    ingredients: [
      ing("Fish balls", "Fiskeboller", "fish", 1, "can"),
      ing("Potato", "Potet", "produce", 1, "kg"),
      ing("Milk", "Melk", "dairy", 5, "dl"),
      ing("Carrot", "Gulrot", "produce", 2, "pcs"),
      ing("White sauce", "Hvit saus", "pantry", 1, "pack"),
    ],
  },
  {
    id: "roast-chicken",
    title: { en: "Roast chicken", no: "Stekt kylling" },
    ingredients: [
      ing("Whole chicken", "Hel kylling", "meat", 1, "pcs"),
      ing("Potato", "Potet", "produce", 1, "kg"),
      ing("Carrot", "Gulrot", "produce", 4, "pcs"),
      ing("Onion", "Løk", "produce", 2, "pcs"),
      ing("Lettuce", "Salat", "produce", 1, "pcs"),
    ],
  },
  {
    id: "beef-stew",
    title: { en: "Beef stew", no: "Oksegryte" },
    ingredients: [
      ing("Stewing beef", "Grytekjøtt", "meat", 600, "g"),
      ing("Potato", "Potet", "produce", 800, "g"),
      ing("Carrot", "Gulrot", "produce", 4, "pcs"),
      ing("Onion", "Løk", "produce", 2, "pcs"),
      ing("Stock", "Buljong", "pantry", 2, "cube"),
    ],
  },
];

export const WEEK_MENUS: WeekMenu[] = [
  {
    id: "weeknights",
    title: { en: "Weeknight favorites", no: "Hverdagsfavoritter" },
    blurb: { en: "Familiar dinners for a normal week.", no: "Kjente middager til en vanlig uke." },
    recipeIds: ["taco", "bolognese", "salmon-potatoes", "chicken-wok", "pizza", "meatballs", "stew"],
  },
  {
    id: "fish",
    title: { en: "Fish and vegetables", no: "Fisk og grønt" },
    blurb: { en: "Fish most days, with vegetables beside them.", no: "Fisk de fleste dagene, med grønnsaker ved siden av." },
    recipeIds: ["cod", "salmon-wrap", "fish-gratin", "shrimp-salad", "fish-cakes", "baked-salmon", "fish-soup"],
  },
  {
    id: "quick",
    title: { en: "Quick week", no: "Rask uke" },
    blurb: { en: "A shorter shopping list and faster meals.", no: "Kortere handleliste og raskere måltider." },
    recipeIds: ["omelette", "sausage-pasta", "quesadilla", "noodle-soup", "hash", "burgers", "tomato-soup"],
  },
  {
    id: "classic",
    title: { en: "Classic family", no: "Klassisk familie" },
    blurb: { en: "The dinners people ask for again.", no: "Middagene folk ber om igjen." },
    recipeIds: ["meatballs-cabbage", "fish-balls", "salmon-potatoes", "bolognese", "taco", "roast-chicken", "beef-stew"],
  },
];

const byId = new Map(RECIPES.map((recipe) => [recipe.id, recipe]));
const byTitle = new Map<string, Recipe>();
for (const recipe of RECIPES) {
  byTitle.set(recipe.title.en.toLocaleLowerCase(), recipe);
  byTitle.set(recipe.title.no.toLocaleLowerCase(), recipe);
}

export function recipeById(id: string): Recipe | undefined {
  return byId.get(id);
}

export function recipeForDinner(dinner: Pick<Dinner, "recipeId" | "title">): Recipe | undefined {
  if (dinner.recipeId) return byId.get(dinner.recipeId);
  return byTitle.get(dinner.title.trim().toLocaleLowerCase());
}

export function recipesForMenu(menu: WeekMenu): Recipe[] {
  return menu.recipeIds.flatMap((id) => {
    const recipe = byId.get(id);
    return recipe ? [recipe] : [];
  });
}

function formatAmount(amount: number, unit: UnitKey, lang: Lang): string {
  if (unit === "g" && amount >= 1000) {
    const kg = Math.round((amount / 1000) * 10) / 10;
    const text = Number.isInteger(kg) ? String(kg) : String(kg);
    return `${text} ${UNIT_LABEL.kg[lang]}`;
  }
  const rounded = Math.round(amount * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${text} ${UNIT_LABEL[unit][lang]}`;
}

function normalized(ingredient: Ingredient): { amount: number; unit: UnitKey } {
  if (ingredient.unit === "kg") return { amount: ingredient.amount * 1000, unit: "g" };
  return { amount: ingredient.amount, unit: ingredient.unit };
}

interface Bucket {
  name: string;
  category: FoodCategory;
  amount?: number;
  unit?: UnitKey;
  extra: string[];
}

function pushIngredient(buckets: Map<string, Bucket>, ingredient: Ingredient, lang: Lang) {
  const name = ingredient.name[lang].trim();
  const key = `${ingredient.category}:${name.toLocaleLowerCase()}`;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { name, category: ingredient.category, extra: [] };
    buckets.set(key, bucket);
  }
  const next = normalized(ingredient);
  if (bucket.amount == null && bucket.extra.length === 0) {
    bucket.amount = next.amount;
    bucket.unit = next.unit;
    return;
  }
  if (bucket.unit === next.unit && bucket.extra.length === 0 && bucket.amount != null) {
    bucket.amount += next.amount;
    return;
  }
  if (bucket.amount != null && bucket.unit) {
    bucket.extra.push(formatAmount(bucket.amount, bucket.unit, lang));
    bucket.amount = undefined;
    bucket.unit = undefined;
  }
  bucket.extra.push(formatAmount(next.amount, next.unit, lang));
}

function toLine(bucket: Bucket, lang: Lang): ShopLine {
  if (bucket.amount != null && bucket.unit && bucket.extra.length === 0) {
    return { name: bucket.name, qty: formatAmount(bucket.amount, bucket.unit, lang), category: bucket.category };
  }
  const parts = [...bucket.extra];
  if (bucket.amount != null && bucket.unit) parts.push(formatAmount(bucket.amount, bucket.unit, lang));
  return { name: bucket.name, qty: parts.length ? parts.join(" + ") : undefined, category: bucket.category };
}

export function ingredientsForDish(id: string, title: string, lang: Lang, favorites: FavoriteRecipe[] = []): ShopLine[] {
  const favorite = favorites.find((item) => item.id === id);
  if (favorite) {
    const lines: ShopLine[] = [];
    for (const item of favorite.ingredients) {
      const name = item.name.trim();
      if (!name) continue;
      lines.push({ name, qty: item.qty?.trim() || undefined, category: foodCategoryOf(item.category) });
    }
    return mergeShopLines(lines, lang);
  }
  const recipe = recipeById(id) ?? recipeForDinner({ title });
  return recipe ? ingredientsForRecipes([recipe], lang) : [];
}

export function ingredientsForRecipes(recipes: Recipe[], lang: Lang): ShopLine[] {
  const buckets = new Map<string, Bucket>();
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) pushIngredient(buckets, ingredient, lang);
  }
  const locale = lang === "no" ? "nb" : "en";
  return [...buckets.values()]
    .map((bucket) => toLine(bucket, lang))
    .sort(
      (a, b) =>
        FOOD_CATEGORIES.indexOf(a.category) - FOOD_CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name, locale),
    );
}

function parseQty(qty?: string): { amount: number; unit: string } | null {
  if (!qty?.trim()) return null;
  const match = qty.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  return { amount, unit: match[2].trim().toLocaleLowerCase() };
}

function formatMerged(amount: number, unit: string): string {
  const rounded = Math.round(amount * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return unit ? `${text} ${unit}` : text;
}

export function mergeShopLines(lines: ShopLine[], lang: Lang): ShopLine[] {
  const buckets = new Map<string, { name: string; category: FoodCategory; amount?: number; unit?: string; loose: string[] }>();
  for (const line of lines) {
    const name = line.name.trim();
    if (!name) continue;
    const key = `${line.category}:${name.toLocaleLowerCase()}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { name, category: line.category, loose: [] };
      buckets.set(key, bucket);
    }
    const parsed = parseQty(line.qty);
    const sameUnit = parsed && bucket.loose.length === 0 && (bucket.amount == null || bucket.unit === parsed.unit);
    if (parsed && sameUnit) {
      bucket.amount = (bucket.amount ?? 0) + parsed.amount;
      bucket.unit = parsed.unit;
      continue;
    }
    if (bucket.amount != null) {
      bucket.loose.push(formatMerged(bucket.amount, bucket.unit ?? ""));
      bucket.amount = undefined;
      bucket.unit = undefined;
    }
    if (line.qty?.trim()) bucket.loose.push(line.qty.trim());
  }
  const locale = lang === "no" ? "nb" : "en";
  return [...buckets.values()]
    .map((bucket) => {
      const parts = [...bucket.loose];
      if (bucket.amount != null) parts.push(formatMerged(bucket.amount, bucket.unit ?? ""));
      return { name: bucket.name, qty: parts.length ? parts.join(" + ") : undefined, category: bucket.category };
    })
    .sort(
      (a, b) =>
        FOOD_CATEGORIES.indexOf(a.category) - FOOD_CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name, locale),
    );
}

export function ingredientsForDinners(
  dinners: Dinner[],
  lang: Lang,
  skipBefore?: string,
  favorites: FavoriteRecipe[] = [],
): ShopLine[] {
  const recipes: Recipe[] = [];
  const extra: ShopLine[] = [];
  const favoriteById = new Map(favorites.map((recipe) => [recipe.id, recipe]));
  for (const dinner of dinners) {
    if (skipBefore) {
      const date = toISODate(addDays(parseISODate(dinner.weekStart), dinner.weekday));
      if (date < skipBefore) continue;
    }
    const favorite = dinner.recipeId ? favoriteById.get(dinner.recipeId) : undefined;
    if (favorite) {
      for (const item of favorite.ingredients) {
        const name = item.name.trim();
        if (!name) continue;
        extra.push({ name, qty: item.qty?.trim() || undefined, category: foodCategoryOf(item.category) });
      }
      continue;
    }
    const recipe = recipeForDinner(dinner);
    if (recipe) recipes.push(recipe);
  }
  return mergeShopLines([...ingredientsForRecipes(recipes, lang), ...extra], lang);
}
