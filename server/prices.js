import { borderOffers } from "./border.js";

const SEARCH_URL = "https://www.okonomi.no/wp-json/okonomi/v1/dagligvarer/sok";
const EAN_URL = "https://www.okonomi.no/wp-json/okonomi/v1/dagligvarer/ean";
const CACHE_MS = 6 * 60 * 60 * 1000;
const MATCH_SCORE = 55;
const MAX_ITEMS = 24;

const SKIP_CHAINS = new Set([
  "ENGROSSNETT_NO",
  "EUROPRIS_NO",
  "COOP_BYGGMIX",
  "COOP_ELEKTRO",
  "COOP_OBS_BYGG",
  "GIGABOKS",
  "HAVARISTEN",
]);

const STOP = new Set([
  "og", "med", "i", "av", "til", "for", "the", "a", "en", "et", "stk", "stykk", "pk", "pakke",
  "boks", "glass", "g", "gr", "gram", "kg", "ml", "cl", "dl", "l", "liter", "fett", "ca", "u", "uten", "m",
  "coop", "kiwi", "rema", "meny", "spar", "joker", "bunnpris", "oda", "extra", "xtra", "first", "price", "eldorado",
]);
const VARIANT = new Set(["lett", "hel", "skummet", "ekstra", "mini", "stor", "naturell", "fersk", "kultur", "lettr"]);
const FORM = new Set(["filet", "file", "biff", "deig", "kjottdeig", "skive", "skiver", "bit", "bat", "loin", "naturell", "hel"]);
const JUNK = ["sjokolade", "iskrem", "potetgull", "chips", "olje", "barnemat", "nugatti"];
const EXTRA_PENALTY = new Map([
  ["skivet", 18],
  ["skived", 18],
  ["syltet", 18],
  ["sylte", 18],
  ["dressing", 22],
  ["maki", 22],
  ["kjøttdeig", 18],
  ["kjottdeig", 18],
  ["deig", 12],
  ["røkt", 14],
  ["røykt", 14],
  ["rokt", 12],
  ["roykt", 12],
]);
const BABY = /(\d+\s*mnd\b|\bmnd\b|\bnestl|\bsemper\b|\bhipp\b|\bellas\b|\bkiddylicious\b|\balex\s*&\s*phil\b)/i;

const cache = new Map();

function cached(key, load) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const promise = Promise.resolve()
    .then(load)
    .catch((error) => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, { expires: Date.now() + CACHE_MS, promise });
  return promise;
}

async function upstream(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "FamCal" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`price lookup ${response.status}`);
  return response.json();
}

function searchProducts(query) {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("size", "80");
  return cached(`search:${query}`, () => upstream(url));
}

function productByEan(ean) {
  return cached(`ean:${ean}`, () => upstream(`${EAN_URL}/${ean}`));
}

function stem(token) {
  let value = token.toLowerCase();
  if (value.length > 5 && value.endsWith("ene")) value = value.slice(0, -3);
  else if (value.length > 4 && value.endsWith("er")) value = value.slice(0, -2);
  else if (value.length > 4 && value.endsWith("e")) value = value.slice(0, -1);
  return value;
}

function tokens(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-zæøå0-9]+/i)
    .filter((token) => token && !STOP.has(token) && !/^\d+$/.test(token) && !/^\d+(g|gr|kg|ml|cl|dl|l|stk)$/.test(token));
}

function tokenScore(queryToken, nameToken) {
  const query = stem(queryToken);
  const name = stem(nameToken);
  if (!query || !name) return 0;
  if (query === name) return 1;
  if (name.endsWith(query) && VARIANT.has(name.slice(0, name.length - query.length))) return 0.92;
  if (name.startsWith(query) && name.length > query.length) {
    let rest = name.slice(query.length);
    if (rest.startsWith("e")) rest = rest.slice(1);
    if (FORM.has(stem(rest)) || FORM.has(rest)) return 0.9;
    if (rest.length <= 2) return 0.8;
    return 0.2;
  }
  if (query.startsWith(name) && query.length - name.length <= 2) return 0.75;
  return 0;
}

function scoreName(query, name) {
  const queryTokens = tokens(query);
  const nameTokens = tokens(name);
  if (!queryTokens.length || !nameTokens.length) return 0;
  const used = new Set();
  let total = 0;
  let weakest = 1;
  for (const queryToken of queryTokens) {
    let best = 0;
    let bestIndex = -1;
    nameTokens.forEach((nameToken, index) => {
      if (used.has(index)) return;
      const score = tokenScore(queryToken, nameToken);
      if (score > best) {
        best = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0 && best >= 0.6) used.add(bestIndex);
    total += best;
    weakest = Math.min(weakest, best);
  }
  if (weakest < 0.6) return 0;
  let score = (total / queryTokens.length) * 100 - (nameTokens.length - used.size) * 7;
  if (BABY.test(name)) score -= 50;
  const lower = name.toLowerCase();
  const queryStems = new Set(queryTokens.map(stem));
  for (const word of JUNK) {
    if (!queryStems.has(stem(word)) && lower.includes(word)) score -= 28;
  }
  const flavor = new Set(["basilikum", "oregano", "hvitløk", "hvitlok", "chili", "urter"]);
  for (const [index, token] of nameTokens.entries()) {
    if (used.has(index)) continue;
    const stemmed = stem(token);
    score -= EXTRA_PENALTY.get(token) || EXTRA_PENALTY.get(stemmed) || 0;
    if (flavor.has(token) || flavor.has(stemmed)) score -= 16;
    if (token === "delt" || stemmed === "delt") score -= 18;
    if ((token === "hele" || stemmed === "hel") && !queryTokens.some((part) => part === "hele" || stem(part) === "hel")) score -= 16;
    if (token.endsWith("smak") || stemmed.endsWith("smak")) score -= 12;
  }
  if (/storhusholdning|10\s*l\b|multipack/i.test(lower)) score -= 20;
  const grams = lower.match(/(\d+)\s*g\b/);
  if (grams && Number(grams[1]) >= 1500) score -= 25;
  if (/løsvekt|losvekt|pr\.?\s*kg|per\s*kg/i.test(lower) && !/løsvekt|losvekt|pr\.?\s*kg/i.test(query)) score -= 30;
  if (/økologisk|\bøko\b/i.test(lower) && !/øko/i.test(query)) score -= 15;
  if (queryTokens.length === 1 && stem(queryTokens[0]) === "melk" && nameTokens.some((token) => token.startsWith("lettmelk"))) {
    score += 6;
  }
  return score;
}

function searchQuery(name) {
  return String(name || "")
    .trim()
    .replace(/\bentrecotte\b/gi, "entrecote")
    .replace(/\bentrecôte\b/gi, "entrecote")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function packs(qty) {
  if (!qty) return 1;
  const match = String(qty).trim().toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return 1;
  const count = Number(match[1].replace(",", "."));
  if (!Number.isFinite(count) || count <= 0 || count > 48) return 1;
  const rest = match[2];
  if (!rest || /^(stk|stykk|pk|pakker|pakke|boks|bokser|glass|pose|poser|eske|esker|brett|kurv|bunt|fedd)\.?$/.test(rest)) {
    return count;
  }
  return 1;
}

function priceNumber(value) {
  if (typeof value === "number") return value;
  if (value && typeof value.price === "number") return value.price;
  return null;
}

function candidatesFrom(data, query) {
  const seen = new Set();
  const scored = [];
  for (const product of data?.data || []) {
    const ean = String(product?.ean || "");
    const name = String(product?.name || "").trim();
    if (!/^\d{8,14}$/.test(ean) || !name || seen.has(ean)) continue;
    seen.add(ean);
    const score = scoreName(query, name);
    if (score <= 0) continue;
    scored.push({
      ean,
      name,
      brand: product.brand ? String(product.brand) : "",
      score,
    });
  }
  scored.sort((a, b) =>
    b.score - a.score
    || Number(!a.ean.startsWith("70")) - Number(!b.ean.startsWith("70"))
    || a.name.length - b.name.length
    || a.name.localeCompare(b.name, "nb"));
  return scored;
}

async function lookupCandidates(name) {
  const query = searchQuery(name);
  if (!query) return [];
  const primary = await searchProducts(query);
  return candidatesFrom(primary, query);
}

function catalogProduct(data) {
  const product = (data?.data?.products || []).find((item) => item?.name);
  return {
    name: product?.name ? String(product.name).trim() : "",
    brand: product?.brand ? String(product.brand) : "",
  };
}

function offersFrom(data) {
  const byChain = new Map();
  for (const product of data?.data?.products || []) {
    const store = product?.store;
    const code = String(store?.code || "");
    const price = priceNumber(product?.current_price);
    if (!code || !store?.name || price == null || price <= 0 || SKIP_CHAINS.has(code)) continue;
    const current = byChain.get(code);
    if (current && current.price <= price) continue;
    byChain.set(code, {
      code,
      name: String(store.name),
      price,
      url: product.url ? String(product.url) : "",
    });
  }
  return [...byChain.values()].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, "nb"));
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index], index);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return out;
}

function cleanItems(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_ITEMS).flatMap((item) => {
    const name = String(item?.name || "").trim().slice(0, 80);
    if (!name) return [];
    const ean = String(item?.ean || "").replace(/\D/g, "");
    return [{
      id: String(item?.id || name).slice(0, 40),
      name,
      qty: item?.qty ? String(item.qty).trim().slice(0, 40) : "",
      ean: /^\d{8,14}$/.test(ean) ? ean : "",
    }];
  });
}

export async function compareShopPrices(input) {
  const requested = cleanItems(input);
  if (!requested.length) {
    return { chains: [], cheapest: null, items: [], border: null };
  }
  const borderPromise = borderOffers(requested).catch(() => null);

  const detailed = await mapPool(requested, 3, async (item) => {
    try {
      const found = await lookupCandidates(item.name);
      const bestScore = found[0]?.score ?? 0;
      const pool = item.ean
        ? [found.find((candidate) => candidate.ean === item.ean) || { ean: item.ean, name: item.name, brand: "", score: MATCH_SCORE }]
        : found.filter((candidate) => candidate.score >= MATCH_SCORE && candidate.score >= bestScore - 8).slice(0, 4);
      let picked = null;
      let offers = [];
      let catalog = { name: "", brand: "" };
      for (const candidate of pool) {
        const payload = await productByEan(candidate.ean);
        const nextOffers = offersFrom(payload);
        if (nextOffers.length < offers.length) continue;
        if (nextOffers.length === offers.length && picked && candidate.score <= picked.score) continue;
        if (!nextOffers.length) continue;
        picked = candidate;
        offers = nextOffers;
        catalog = catalogProduct(payload);
      }
      if (!picked) {
        return {
          id: item.id,
          name: item.name,
          qty: item.qty,
          count: packs(item.qty),
          status: "unmatched",
          product: null,
          alternatives: found.filter((candidate) => candidate.score >= 40).slice(0, 6).map(slim),
          prices: [],
        };
      }
      const known = found.find((candidate) => candidate.ean === picked.ean);
      return {
        id: item.id,
        name: item.name,
        qty: item.qty,
        count: packs(item.qty),
        status: "matched",
        product: { ean: picked.ean, name: known?.name || catalog.name || picked.name, brand: known?.brand || catalog.brand || picked.brand || "" },
        alternatives: found.filter((candidate) => candidate.ean !== picked.ean && candidate.score >= 40).slice(0, 6).map(slim),
        prices: offers,
      };
    } catch {
      return {
        id: item.id,
        name: item.name,
        qty: item.qty,
        count: packs(item.qty),
        status: "error",
        product: null,
        alternatives: [],
        prices: [],
      };
    }
  });

  if (detailed.every((item) => item.status === "error")) {
    const error = new Error("price lookup failed");
    error.status = 502;
    throw error;
  }

  const matched = detailed.filter((item) => item.status === "matched");
  const chainTotals = new Map();
  for (const item of matched) {
    for (const offer of item.prices) {
      const current = chainTotals.get(offer.code) || { code: offer.code, name: offer.name, cents: 0, found: 0 };
      current.cents += Math.round(offer.price * 100) * item.count;
      current.found += 1;
      chainTotals.set(offer.code, current);
    }
  }
  const chains = [...chainTotals.values()]
    .map((chain) => ({
      code: chain.code,
      name: chain.name,
      total: chain.cents / 100,
      found: chain.found,
      missing: matched.length - chain.found,
      complete: chain.found === matched.length,
    }))
    .sort((a, b) => a.missing - b.missing || a.total - b.total || a.name.localeCompare(b.name, "nb"))
    .slice(0, 8);
  const shown = new Set(chains.map((chain) => chain.code));
  for (const item of detailed) {
    item.prices = item.prices.filter((offer) => shown.has(offer.code));
  }
  const complete = chains.filter((chain) => chain.complete);
  const cheapest = complete.length
    ? complete.reduce((best, chain) => (chain.total < best.total ? chain : best))
    : null;

  return {
    checkedAt: Date.now(),
    source: "Økonomi.no",
    sourceUrl: "https://www.okonomi.no/",
    chains,
    cheapest: cheapest ? { code: cheapest.code, name: cheapest.name, total: cheapest.total } : null,
    items: detailed,
    border: await borderPromise,
  };
}

function slim(candidate) {
  return { ean: candidate.ean, name: candidate.name, brand: candidate.brand };
}
