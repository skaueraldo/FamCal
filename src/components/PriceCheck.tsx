import { Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { localeTag } from "../lib/i18n";
import { useApp } from "../state/AppState";

interface PriceLine {
  id: string;
  name: string;
  qty?: string;
}

interface ChainPrice {
  code: string;
  name: string;
  total: number;
  found: number;
  missing: number;
  complete: boolean;
}

interface Offer {
  code: string;
  name: string;
  price: number;
  url?: string;
}

interface PricedItem {
  id: string;
  name: string;
  qty: string;
  count: number;
  status: "matched" | "unmatched" | "error";
  product: { ean: string; name: string; brand: string } | null;
  alternatives: { ean: string; name: string; brand: string }[];
  prices: Offer[];
}

interface BorderOffer {
  name: string;
  detail: string;
  label: string;
  perKg: boolean;
  nok: number | null;
}

interface BorderStore {
  code: string;
  name: string;
  place: string;
  url: string;
  matches: { id: string; offer: BorderOffer | null }[];
}

interface PriceReport {
  sourceUrl?: string;
  chains: ChainPrice[];
  cheapest: { code: string; name: string; total: number } | null;
  items: PricedItem[];
  border?: {
    rate: { nokPerHundredSek: number; date: string } | null;
    stores: BorderStore[];
  } | null;
}

function money(amount: number, language: "en" | "no") {
  return new Intl.NumberFormat(localeTag(language), { style: "currency", currency: "NOK" }).format(amount);
}

function lineTotal(price: number, count: number) {
  return Math.round(price * 100 * count) / 100;
}

export function PriceCheck({ items }: { items: PriceLine[] }) {
  const { t, language } = useApp();
  const [result, setResult] = useState<PriceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const signature = items.map((item) => `${item.id}\t${item.name}\t${item.qty ?? ""}`).join("\n");
  const request = useRef(0);
  const loadedSig = useRef<string | null>(null);
  const [open, setOpen] = useState(false);

  const run = async (chosen: Record<string, string>, signal?: AbortSignal) => {
    const id = ++request.current;
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/shop-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            qty: item.qty,
            ean: chosen[item.id] || undefined,
          })),
        }),
        signal,
      });
      if (!response.ok) throw new Error("failed");
      const report = (await response.json()) as PriceReport;
      if (signal?.aborted || id !== request.current) return;
      loadedSig.current = signature;
      setResult(report);
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      if (id !== request.current) return;
      setError(true);
    } finally {
      if (!signal?.aborted && id === request.current) setLoading(false);
    }
  };

  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    if (!signature) {
      setResult(null);
      setError(false);
      loadedSig.current = null;
      return;
    }
    if (loadedSig.current && loadedSig.current !== signature) {
      setResult(null);
      loadedSig.current = null;
    }
    if (!open || loadedSig.current === signature) return;
    const controller = new AbortController();
    void runRef.current({}, controller.signal);
    return () => controller.abort();
  }, [open, signature]);

  const choose = (id: string, ean: string) => {
    if (!result) return;
    const chosen: Record<string, string> = {};
    for (const item of result.items) {
      if (item.product) chosen[item.id] = item.product.ean;
    }
    if (ean) chosen[id] = ean;
    else delete chosen[id];
    void run(chosen);
  };

  if (items.length === 0) {
    return <p className="meta price-check-note">{t("priceAllChecked")}</p>;
  }

  const format = (amount: number) => money(amount, language);
  const unmatched = result?.items.filter((item) => item.status !== "matched").length ?? 0;
  let summary = "";
  if (result && !result.chains.length) summary = t("priceNoPrices");
  else if (result?.cheapest) {
    const vars = { store: result.cheapest.name, total: format(result.cheapest.total) };
    summary = unmatched ? t("priceCheapestKnown", vars) : t("priceCheapest", vars);
  } else if (result?.chains[0]) {
    const closest = result.chains[0];
    summary = t("priceClosest", { store: closest.name, total: format(closest.total), missing: closest.missing });
  }

  return (
    <details className="price-check collapse-section" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <h2>{t("priceTitle")}</h2>
      </summary>
      <div className="collapse-section-body">
      <button className="btn secondary small" type="button" onClick={() => void run({})} disabled={loading}>
        <Tag size={16} />
        {loading ? t("checkingPrices") : t("checkPrices")}
      </button>
      {loading && !result ? <p className="meta">{t("checkingPrices")}</p> : null}
      {error ? <p className="error">{t("priceFailed")}</p> : null}
      {result ? (
        <div className="price-result">
          {summary ? <p className="price-summary">{summary}</p> : null}
          {result.chains.length > 0 ? (
            <div className="price-chains">
              {result.chains.map((chain) => {
                const best = Boolean(result.cheapest && chain.complete && chain.total === result.cheapest.total);
                return (
                  <div className={`price-chain${best ? " best" : ""}`} key={chain.code}>
                    <strong>{chain.name}</strong>
                    <span>{format(chain.total)}</span>
                    <span className="meta">{chain.complete ? t("priceHasAll") : t("priceMissingCount", { n: chain.missing })}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="price-items">
            {result.items.map((item) => {
              const options = [
                ...(item.product ? [item.product] : []),
                ...item.alternatives.filter((alternative) => alternative.ean !== item.product?.ean),
              ];
              const lowest = item.prices.reduce<number | null>((min, offer) => (min == null || offer.price < min ? offer.price : min), null);
              return (
                <div className="price-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    {item.qty ? <span className="meta"> · {item.qty}</span> : null}
                    {item.count > 1 ? <div className="meta">{t("priceTimes", { n: item.count })}</div> : null}
                  </div>
                  {options.length > 0 ? (
                    <select
                      aria-label={t("priceChooseProduct", { name: item.name })}
                      value={item.product?.ean ?? ""}
                      disabled={loading}
                      onChange={(event) => choose(item.id, event.target.value)}
                    >
                      {item.product ? null : <option value="">{t("priceUnmatched")}</option>}
                      {options.map((option) => (
                        <option key={option.ean} value={option.ean}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="meta">{t("priceUnmatched")}</p>
                  )}
                  {item.prices.length > 0 ? (
                    <div className="price-offers">
                      {result.chains.map((chain) => {
                        const offer = item.prices.find((entry) => entry.code === chain.code);
                        if (!offer) {
                          return (
                            <span className="price-pill missing" key={chain.code}>
                              {chain.name}
                              <span>{t("priceMissing")}</span>
                            </span>
                          );
                        }
                        return (
                          <span className={`price-pill${offer.price === lowest ? " low" : ""}`} key={chain.code}>
                            {chain.name}
                            <span>{format(lineTotal(offer.price, item.count))}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="meta price-source">
            <a href={result.sourceUrl || "https://www.okonomi.no/"} target="_blank" rel="noreferrer">
              Data fra Økonomi.no
            </a>{" "}
            {t("priceSourceRest")}
          </p>
          {result.border?.stores?.length ? (
            <div className="border-shops">
              <h3>{t("borderTitle")}</h3>
              <p className="meta">{t("borderLede")}</p>
              {result.border.rate ? (
                <p className="meta">
                  {t("borderRate", {
                    nok: new Intl.NumberFormat(localeTag(language), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(result.border.rate.nokPerHundredSek),
                    date: new Intl.DateTimeFormat(localeTag(language), { day: "numeric", month: "long" }).format(new Date(`${result.border.rate.date}T12:00:00`)),
                  })}
                </p>
              ) : null}
              {result.items.map((item) => (
                <div className="price-item" key={`border-${item.id}`}>
                  <strong>{item.name}</strong>
                  <div className="price-offers">
                    {result.border?.stores.map((store) => {
                      const offer = store.matches.find((match) => match.id === item.id)?.offer;
                      return (
                        <span className={`price-pill${offer ? "" : " missing"}`} key={store.code}>
                          <a href={store.url} target="_blank" rel="noreferrer">
                            {store.name}
                          </a>
                          <span>
                            {offer
                              ? `${offer.name}: ${offer.label}${offer.nok != null ? ` · ${format(offer.nok)}` : ""}`
                              : t("borderNoOffer")}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
    </details>
  );
}
