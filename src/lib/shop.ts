import { uid } from "./id";
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

export function shoppingArchiveName(
  at: number,
  locale: string,
  existing: { createdAt: number }[],
): string {
  const date = new Date(at);
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
  const sameDay = existing.some((entry) => {
    const other = new Date(entry.createdAt);
    return (
      other.getFullYear() === date.getFullYear() &&
      other.getMonth() === date.getMonth() &&
      other.getDate() === date.getDate()
    );
  });
  if (!sameDay) return day;
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${day}, ${time}`;
}

export interface ShopDraft {
  name: string;
  qty?: string;
  category?: string;
}

export function planShopAdditions(
  current: ShopItem[],
  drafts: ShopDraft[],
  memberId: string,
  now = Date.now(),
): { add: ShopItem[]; update: ShopItem[] } {
  const add: ShopItem[] = [];
  const update: ShopItem[] = [];
  const seen = new Set(current.filter((item) => !item.done).map((item) => shopKey(item.name)));
  for (const draft of drafts) {
    const name = draft.name.trim();
    const key = shopKey(name);
    if (!key) continue;
    if (seen.has(key)) {
      const existing = current.find((item) => !item.done && shopKey(item.name) === key);
      if (existing && !existing.category && draft.category) update.push({ ...existing, category: draft.category });
      continue;
    }
    seen.add(key);
    add.push({
      id: uid("shop"),
      name,
      qty: draft.qty?.trim() || undefined,
      category: draft.category,
      done: false,
      memberId,
      createdAt: now,
    });
  }
  return { add, update };
}
