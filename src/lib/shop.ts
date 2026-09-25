import type { ShopHistoryEntry, ShopItem } from "../types";

const MAX_HISTORY = 80;

export function shopKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function rememberShopItem(
  history: ShopHistoryEntry[],
  name: string,
  qty?: string,
  at = Date.now(),
): ShopHistoryEntry[] {
  const trimmed = name.trim();
  const key = shopKey(trimmed);
  if (!key) return history;
  const exists = history.some((entry) => shopKey(entry.name) === key);
  const next = exists
    ? history.map((entry) =>
        shopKey(entry.name) === key
          ? { ...entry, name: trimmed, qty: qty || entry.qty, lastUsed: at, uses: entry.uses + 1 }
          : entry,
      )
    : [...history, { name: trimmed, qty, lastUsed: at, uses: 1 }];
  return next.sort((a, b) => b.lastUsed - a.lastUsed || b.uses - a.uses).slice(0, MAX_HISTORY);
}

export function seedShopHistory(history: ShopHistoryEntry[] | undefined, items: ShopItem[]): ShopHistoryEntry[] {
  if (history?.length) return history;
  return items.reduce<ShopHistoryEntry[]>(
    (next, item) => rememberShopItem(next, item.name, item.qty, item.createdAt),
    [],
  );
}

export function suggestShopItems(
  history: ShopHistoryEntry[],
  current: ShopItem[],
  query: string,
  limit = 8,
): ShopHistoryEntry[] {
  const onList = new Set(current.map((item) => shopKey(item.name)));
  const q = shopKey(query);
  return history
    .filter((entry) => !onList.has(shopKey(entry.name)) && (!q || shopKey(entry.name).includes(q)))
    .sort((a, b) => {
      if (q) {
        const aStarts = shopKey(a.name).startsWith(q) ? 1 : 0;
        const bStarts = shopKey(b.name).startsWith(q) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
      }
      return b.uses - a.uses || b.lastUsed - a.lastUsed;
    })
    .slice(0, limit);
}
