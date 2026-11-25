import { normalizeCode } from "./identity";

const SNAPSHOT_KEY = "famcal.sharedView";
const LIST_ID = /^[a-z]{2,12}_[a-z0-9]+$/i;
const SHARE_TOKEN = /^[a-f0-9]{32,64}$/i;

export type ListShareKind = "todos" | "wishlist" | "spendings";

export interface ListShareLink {
  code: string;
  listId: string;
  tab: ListShareKind;
}

export interface SharedTodoItem {
  name: string;
  done: boolean;
  addedBy: string;
}

export interface SharedWishItem {
  name: string;
  addedBy: string;
}

export interface SharedSpendItem {
  name: string;
  cost: number;
  date: string;
  addedBy: string;
}

export interface SharedListSnapshot {
  kind: ListShareKind;
  name: string;
  items: SharedTodoItem[] | SharedWishItem[] | SharedSpendItem[];
}

export type ShareVisit =
  | { kind: "token"; token: string }
  | { kind: "legacy"; code: string; listId: string; tab: ListShareKind };

function originUrl(): URL {
  const origin = typeof location !== "undefined" && location.origin ? location.origin : "";
  return new URL(origin || "https://famcal-lilac.vercel.app");
}

function tabFromListId(listId: string): ListShareKind | null {
  if (listId.startsWith("todo_")) return "todos";
  if (listId.startsWith("wish_")) return "wishlist";
  if (listId.startsWith("spend_")) return "spendings";
  return null;
}

function parseTab(raw: string | null): ListShareKind | null {
  if (raw === "todos" || raw === "wishlist" || raw === "spendings") return raw;
  return null;
}

export function parseListId(raw: string | null | undefined): string {
  const id = String(raw || "").trim();
  if (!id || id.length > 80 || !LIST_ID.test(id)) return "";
  return id;
}

export function parseShareToken(raw: string | null | undefined): string {
  const token = String(raw || "").trim().toLowerCase();
  return SHARE_TOKEN.test(token) ? token : "";
}

export function createShareToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parseListLink(search = typeof location !== "undefined" ? location.search : ""): ListShareLink | null {
  try {
    const params = new URLSearchParams(search);
    const listId = parseListId(params.get("list"));
    const code = normalizeCode(params.get("code") || "");
    if (!listId || !code) return null;
    const tab = parseTab(params.get("tab")) || tabFromListId(listId);
    if (!tab) return null;
    return { code, listId, tab };
  } catch {
    return null;
  }
}

export function readShareVisit(search = typeof location !== "undefined" ? location.search : ""): ShareVisit | null {
  try {
    const params = new URLSearchParams(search);
    const token = parseShareToken(params.get("share"));
    if (token) return { kind: "token", token };
    const legacy = parseListLink(search);
    if (!legacy) return null;
    return { kind: "legacy", code: legacy.code, listId: legacy.listId, tab: legacy.tab };
  } catch {
    return null;
  }
}

export function listShareUrl(token: string): string {
  const url = originUrl();
  const cleaned = parseShareToken(token);
  if (cleaned) url.searchParams.set("share", cleaned);
  return url.toString();
}

function clip(value: unknown, max: number): string {
  return String(value || "").trim().slice(0, max);
}

export function sanitizeSharedSnapshot(raw: unknown): SharedListSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { kind?: unknown; name?: unknown; items?: unknown };
  const kind = body.kind === "todos" || body.kind === "wishlist" || body.kind === "spendings" ? body.kind : null;
  const name = clip(body.name, 80);
  if (!kind || !name || !Array.isArray(body.items)) return null;
  if (kind === "todos") {
    const items = body.items
      .map((item) => {
        const row = item as { name?: unknown; done?: unknown; addedBy?: unknown };
        const label = clip(row.name, 80);
        if (!label) return null;
        return { name: label, done: Boolean(row.done), addedBy: clip(row.addedBy, 60) };
      })
      .filter((item): item is SharedTodoItem => Boolean(item));
    return { kind, name, items };
  }
  if (kind === "wishlist") {
    const items = body.items
      .map((item) => {
        const row = item as { name?: unknown; addedBy?: unknown };
        const label = clip(row.name, 80);
        if (!label) return null;
        return { name: label, addedBy: clip(row.addedBy, 60) };
      })
      .filter((item): item is SharedWishItem => Boolean(item));
    return { kind, name, items };
  }
  const items = body.items
    .map((item) => {
      const row = item as { name?: unknown; cost?: unknown; date?: unknown; addedBy?: unknown };
      const label = clip(row.name, 80);
      if (!label) return null;
      const cost = Number(row.cost);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(row.date || "")) ? String(row.date) : "";
      return {
        name: label,
        cost: Number.isFinite(cost) ? cost : 0,
        date,
        addedBy: clip(row.addedBy, 60),
      };
    })
    .filter((item): item is SharedSpendItem => Boolean(item));
  return { kind, name, items };
}

export function rememberSharedSnapshot(list: SharedListSnapshot) {
  try {
    sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function readRememberedShare(search = typeof location !== "undefined" ? location.search : ""): SharedListSnapshot | null {
  try {
    const params = new URLSearchParams(search);
    if (params.get("shared") !== "1" || params.get("share") || params.get("code") || params.get("list")) return null;
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return sanitizeSharedSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearRememberedShare() {
  try {
    sessionStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}

export function stripShareSecretsFromUrl(mode: "token" | "flag" | "clear") {
  try {
    const url = new URL(location.href);
    url.searchParams.delete("list");
    url.searchParams.delete("tab");
    url.searchParams.delete("code");
    if (mode !== "token") url.searchParams.delete("share");
    if (mode === "flag") url.searchParams.set("shared", "1");
    else url.searchParams.delete("shared");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
}
