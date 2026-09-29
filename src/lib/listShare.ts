import { normalizeCode } from "./identity";

const STASH_KEY = "famcal.listLink";
const LIST_ID = /^[a-z]{2,12}_[a-z0-9]+$/i;

export type ListShareKind = "todos" | "wishlist" | "spendings";

export interface ListShareLink {
  code: string;
  listId: string;
  tab: ListShareKind;
}

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

export function listAppLink(code: string, listId: string): string {
  const url = originUrl();
  const cleaned = normalizeCode(code);
  const id = parseListId(listId);
  if (cleaned) url.searchParams.set("code", cleaned);
  if (id) url.searchParams.set("list", id);
  return url.toString();
}

export function stashListLink(link: ListShareLink) {
  try {
    sessionStorage.setItem(STASH_KEY, JSON.stringify(link));
  } catch {
    /* ignore */
  }
}

export function readStashedListLink(): ListShareLink | null {
  try {
    const raw = sessionStorage.getItem(STASH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListShareLink>;
    const listId = parseListId(parsed.listId);
    const code = normalizeCode(String(parsed.code || ""));
    const tab = parsed.tab === "todos" || parsed.tab === "wishlist" || parsed.tab === "spendings" ? parsed.tab : tabFromListId(listId);
    if (!listId || !code || !tab) return null;
    return { code, listId, tab };
  } catch {
    return null;
  }
}

export function clearStashedListLink() {
  try {
    sessionStorage.removeItem(STASH_KEY);
  } catch {
    /* ignore */
  }
}

export function captureListLink(): ListShareLink | null {
  const fromUrl = parseListLink();
  if (fromUrl) stashListLink(fromUrl);
  return fromUrl || readStashedListLink();
}

export function stripListLinkFromUrl() {
  try {
    const url = new URL(location.href);
    url.searchParams.delete("list");
    url.searchParams.delete("tab");
    url.searchParams.delete("code");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
}
