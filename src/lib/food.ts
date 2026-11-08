import type { MessageKey } from "./i18n";

export const FOOD_CATEGORIES = ["produce", "dairy", "meat", "fish", "bakery", "pantry", "frozen", "other"] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const FOOD_CATEGORY_KEY: Record<FoodCategory, MessageKey> = {
  produce: "foodProduce",
  dairy: "foodDairy",
  meat: "foodMeat",
  fish: "foodFish",
  bakery: "foodBakery",
  pantry: "foodPantry",
  frozen: "foodFrozen",
  other: "foodOther",
};

export function foodCategoryOf(category?: string): FoodCategory {
  return (FOOD_CATEGORIES as readonly string[]).includes(category ?? "") ? (category as FoodCategory) : "other";
}

const NO_PREFIX = new Set(["mel"]);
const PLURAL = /^(?:e|er|r|ene|erne|en|et|a|s)?$/;

const FOOD_WORDS: { category: FoodCategory; words: string[] }[] = [
  {
    category: "produce",
    words: [
      "eple", "epler", "banan", "bananer", "appelsin", "appelsiner", "sitron", "sitroner", "pære", "pærer",
      "drue", "druer", "jordbær", "blåbær", "bringebær", "melon", "vannmelon", "mango", "kiwi", "avokado",
      "tomat", "tomater", "agurk", "paprika", "salat", "løk", "rødløk", "hvitløk", "gulrot", "gulrøtter",
      "potet", "poteter", "brokkoli", "blomkål", "hodekål", "kålrot", "squash", "aubergine", "sopp", "spinat",
      "purre", "ingefær", "chili", "persille", "dill", "basilikum", "frukt", "grønnsak", "grønnsaker", "grønt",
      "apple", "apples", "banana", "orange", "lemon", "grape", "strawberry", "blueberry", "avocado", "tomato",
      "cucumber", "lettuce", "onion", "garlic", "carrot", "potato", "potatoes", "broccoli", "cabbage", "bell pepper",
    ],
  },
  {
    category: "dairy",
    words: [
      "melk", "lettmelk", "helmelk", "fløte", "rømme", "seterrømme", "ost", "fløteost", "salatost", "smør",
      "yoghurt", "yogurt", "egg", "eggerøre", "kesam", "cottage cheese", "crème fraîche", "creme fraiche",
      "skyr", "kefir", "kulturmelk", "milk", "cream", "sour cream", "cheese", "butter", "eggs",
    ],
  },
  {
    category: "meat",
    words: [
      "kylling", "kyllingfilet", "biff", "flatbiff", "oksebiff", "kjøttdeig", "kjøtt", "kjøttkaker", "kjøttboller",
      "svinekjøtt", "svinekotelett", "kotelett", "bacon", "skinke", "pølse", "pølser", "grillpølse", "karbonadedeig",
      "lam", "lammelår", "lammekjøtt", "kalkun", "entrecote", "entrecôte", "indrefilet", "ytrefilet", "mørbrad", "høyrygg",
      "grytekjøtt", "ribbe", "pinnekjøtt", "medister", "salami", "pepperoni", "oksekjøtt", "chicken", "beef",
      "steak", "mince", "minced meat", "pork", "ham", "sausage", "sausages", "turkey", "lamb",
    ],
  },
  {
    category: "fish",
    words: [
      "laks", "laksefilet", "torsk", "torskefilet", "sei", "ørret", "reker", "reke", "fisk", "fiskekaker",
      "fiskeboller", "makrell", "sild", "tunfisk", "scampi", "salmon", "cod", "trout", "shrimp", "prawn", "fish",
    ],
  },
  {
    category: "bakery",
    words: [
      "brød", "grovbrød", "loff", "lompe", "lefse", "tacolefser", "tortilla", "tortillalefser", "rundstykke",
      "bagett", "bolle", "boller", "knekkebrød", "hamburgerbrød", "pølsebrød", "pitabrød", "focaccia", "ciabatta",
      "pizzadeig", "bread", "bun", "buns", "tortillas", "baguette", "roll",
    ],
  },
  {
    category: "pantry",
    words: [
      "pasta", "spagetti", "spaghetti", "makaroni", "ris", "risgrøt", "nudler", "hvetemel", "havremel", "mel",
      "sukker", "havregryn", "olje", "olivenolje", "eddik", "ketchup", "sennep", "majones", "soyasaus", "buljong",
      "tacosaus", "hakkede tomater", "tomatsaus", "mais", "bønner", "linser", "hermetikk", "rice", "noodles",
      "flour", "sugar", "oil", "pasta sauce", "stock", "beans", "sweetcorn",
    ],
  },
  {
    category: "frozen",
    words: [
      "pommes frites", "pommes", "fries", "wokgrønnsaker", "frossen", "fryst", "fryste", "iskrem", "frossenpizza",
      "grandiosa", "erter", "frozen", "ice cream",
    ],
  },
];

function normalizeFoodName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("nb")
    .replace(/[éèêë]/g, "e")
    .replace(/[áàâ]/g, "a")
    .replace(/ö/g, "ø")
    .replace(/ä/g, "æ")
    .replace(/\s+/g, " ");
}

function mentions(name: string, word: string): boolean {
  const hay = normalizeFoodName(name);
  const needle = normalizeFoodName(word);
  if (!needle) return false;
  if (needle.includes(" ")) return hay.includes(needle);
  const boundary = new RegExp(`(?:^|[^a-z0-9æøå])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([a-z0-9æøå]*)`, "gi");
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(hay))) {
    if (PLURAL.test(match[1] ?? "")) return true;
  }
  return hay.split(/[^a-z0-9æøå]+/).some((token) => {
    if (!token || token === needle) return false;
    if (!NO_PREFIX.has(needle) && needle.length >= 4 && token.startsWith(needle)) return true;
    return needle.length >= 3 && token.endsWith(needle) && token.length - needle.length >= 3;
  });
}

export function categorizeFood(name: string): FoodCategory {
  let best: { category: FoodCategory; length: number } | null = null;
  for (const rule of FOOD_WORDS) {
    for (const word of rule.words) {
      if (best && word.length < best.length) continue;
      if (!mentions(name, word)) continue;
      if (!best || word.length > best.length) best = { category: rule.category, length: word.length };
    }
  }
  return best?.category ?? "other";
}

export function itemFoodCategory(item: { name: string; category?: string }): FoodCategory {
  if (item.category) return foodCategoryOf(item.category);
  return categorizeFood(item.name);
}
