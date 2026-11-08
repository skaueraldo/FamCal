const STORES = [
  {
    code: "maximat",
    name: "Maximat",
    place: "Svinesund",
    url: "https://www.maximatsvinesund.se/ukens-tilbud",
    kind: "html",
  },
  {
    code: "eurocash",
    name: "EuroCash",
    place: "Svinesund",
    url: "https://www.eurocash.se/butiker/svinesund/",
    offersUrl: "https://www.eurocash.se/",
    kind: "eurocash",
  },
  {
    code: "nordby",
    name: "Nordby Supermarket",
    place: "Nordby",
    url: "https://www.nordbysupermarket.se/ukens-tilbud",
    kind: "html",
  },
];

const CACHE_MS = 6 * 60 * 60 * 1000;
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

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { accept: "text/html,application/json", "user-agent": "FamCal" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`border lookup ${response.status}`);
  return response.text();
}

function decode(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sekAmount(major, minor) {
  const whole = Number(major);
  const fraction = minor == null || minor === "" ? 0 : Number(minor) / 100;
  if (!Number.isFinite(whole)) return null;
  return Math.round((whole + fraction) * 100) / 100;
}

function parseHtmlOffers(html) {
  const articles = html.match(/<article[\s\S]*?<\/article>/g) || [];
  return articles.flatMap((article) => {
    const name = decode(article.match(/<h3[^>]*>([^<]+)<\/h3>/)?.[1] || "");
    if (!name) return [];
    const detail = decode(article.match(/<p[^>]*>([^<]*)<\/p>/)?.[1] || "");
    const major = article.match(/text-\[4\.375rem\][^>]*>(\d+)/)?.[1];
    const minor = article.match(/text-3xl[^>]*>(\d{2})</)?.[1];
    const perKg = /PR\s*KG/i.test(article);
    const plain = decode(article.replace(/<[^>]+>/g, " "));
    const multi = plain.match(/(\d+)\s+for\s+(\d+)/i);
    if (multi) {
      return [{ name, detail, sek: null, perKg: false, label: `${multi[1]} for ${multi[2]} SEK` }];
    }
    if (major) {
      const sek = sekAmount(major, minor);
      const label = `${String(sek).replace(".", ",")} SEK${perKg ? "/kg" : ""}`;
      return [{ name, detail, sek: perKg ? null : sek, perKg, label }];
    }
    if (multi) {
      return [{ name, detail, sek: null, perKg: false, label: `${multi[1]} for ${multi[2]} SEK` }];
    }
    return [{ name, detail, sek: null, perKg: false, label: "" }];
  });
}

function parseEuroPrice(price) {
  const text = String(price || "").trim();
  const main = text.split(/,\s*(?:jmf|lägsta|lagsta)/i)[0];
  const perKg = /\/\s*kg/i.test(main);
  const multi = /\d+\s*f[oö]r/i.test(main);
  const match = main.match(/(\d+)[,.](\d{2})/);
  const sek = match ? sekAmount(match[1], match[2]) : null;
  const unit = perKg ? "/kg" : "";
  const label = match ? `${match[1]},${match[2]} SEK${unit}` : main;
  return { sek: perKg || multi ? null : sek, perKg, label };
}

function parseEurocash(html) {
  const start = html.indexOf("{", html.indexOf("var dataStore = "));
  if (start < 0) return [];
  let depth = 0;
  let end = -1;
  for (let i = start; i < html.length; i += 1) {
    if (html[i] === "{") depth += 1;
    else if (html[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) return [];
  const data = JSON.parse(html.slice(start, end));
  const store = (data.stores || []).find((item) => item.slug === "svinesund");
  return (store?.offers_weekly?.offers || []).map((offer) => {
    const price = parseEuroPrice(offer.price);
    return {
      name: decode(offer.header),
      detail: decode(offer.text),
      sek: price.sek,
      perKg: price.perKg,
      label: price.label,
    };
  });
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/kyckling/g, "kylling")
    .replace(/ä/g, "æ")
    .replace(/ö/g, "ø");
}

function stem(token) {
  let value = token;
  if (value.length > 5 && value.endsWith("ene")) value = value.slice(0, -3);
  else if (value.length > 4 && value.endsWith("er")) value = value.slice(0, -2);
  else if (value.length > 4 && value.endsWith("e")) value = value.slice(0, -1);
  return value;
}

function words(value) {
  return normalize(value)
    .split(/[^a-zæøå0-9]+/i)
    .map(stem)
    .filter((token) => token && token.length > 2 && !/^\d+$/.test(token));
}

function offerMatches(itemName, offer) {
  const query = words(itemName);
  const hay = new Set([...words(offer.name), ...words(offer.detail)]);
  if (!query.length || !hay.size) return false;
  return query.every((word) => {
    if (hay.has(word)) return true;
    for (const token of hay) {
      if (token.startsWith(word) && token.length - word.length <= 2) return true;
      if (word.startsWith(token) && word.length - token.length <= 2 && token.length >= 4) return true;
    }
    return false;
  });
}

function pickOffer(itemName, offers) {
  const hits = offers.filter((offer) => offerMatches(itemName, offer));
  if (!hits.length) return null;
  hits.sort((a, b) => Number(b.sek != null) - Number(a.sek != null) || (a.sek ?? Infinity) - (b.sek ?? Infinity));
  return hits[0];
}

async function sekRate() {
  return cached("border:rate", async () => {
    const csv = await fetchText("https://data.norges-bank.no/api/data/EXR/B.SEK.NOK.SP?lastNObservations=1&format=csv");
    const lines = csv.trim().split(/\r?\n/);
    const header = lines[0].split(";");
    const row = lines[1].split(";");
    const value = Number(row[header.indexOf("OBS_VALUE")]);
    const date = row[header.indexOf("TIME_PERIOD")];
    if (!Number.isFinite(value) || value <= 0) throw new Error("missing sek rate");
    const nokPerHundredSek = value > 20 ? value : value * 100;
    return { nokPerHundredSek, date };
  });
}

async function storeOffers(store) {
  return cached(`border:${store.code}`, async () => {
    if (store.kind === "eurocash") return parseEurocash(await fetchText(store.offersUrl));
    return parseHtmlOffers(await fetchText(store.url));
  });
}

export async function borderOffers(items) {
  const list = Array.isArray(items) ? items : [];
  const [rate, offers] = await Promise.all([
    sekRate().catch(() => null),
    Promise.all(STORES.map(async (store) => ({ store, offers: await storeOffers(store).catch(() => []) }))),
  ]);
  const nokFor = (sek) => (rate && sek != null ? Math.round(sek * rate.nokPerHundredSek) / 100 : null);
  return {
    rate,
    stores: offers.map(({ store, offers: rows }) => ({
      code: store.code,
      name: store.name,
      place: store.place,
      url: store.url,
      matches: list.map((item) => {
        const offer = pickOffer(item.name, rows);
        return {
          id: String(item.id || item.name),
          offer: offer
            ? { name: offer.name, detail: offer.detail, label: offer.label, perKg: offer.perKg, nok: nokFor(offer.sek) }
            : null,
        };
      }),
    })),
  };
}
