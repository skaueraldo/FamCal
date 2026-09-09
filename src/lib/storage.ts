import type { Lang, Theme } from "./i18n";
import { detectLang } from "./i18n";
import type { Group, Session } from "../types";

const KEY = "famcal.session";
const PREFS_KEY = "famcal.prefs";
const groupKey = (code: string) => `famcal.group.${code.toUpperCase()}`;

export type NotifyChannel = "calendar" | "dinner" | "shopping" | "wishlist";

export interface NotifyPrefs {
  calendar: boolean;
  dinner: boolean;
  shopping: boolean;
  wishlist: boolean;
}

export interface Prefs {
  theme: Theme;
  language: Lang;
  notify: NotifyPrefs;
}

export function emptyNotify(): NotifyPrefs {
  return { calendar: false, dinner: false, shopping: false, wishlist: false };
}

function parseNotify(parsed: Partial<Prefs> & { notifications?: boolean }): NotifyPrefs {
  const raw = parsed.notify;
  if (raw && typeof raw === "object") {
    return {
      calendar: raw.calendar === true,
      dinner: raw.dinner === true,
      shopping: raw.shopping === true,
      wishlist: raw.wishlist === true,
    };
  }
  if (parsed.notifications === true) {
    return { calendar: true, dinner: false, shopping: true, wishlist: false };
  }
  return emptyNotify();
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Prefs> & { notifications?: boolean };
      return {
        theme: parsed.theme === "dark" ? "dark" : "light",
        language: parsed.language === "no" ? "no" : parsed.language === "en" ? "en" : detectLang(),
        notify: parseNotify(parsed),
      };
    }
  } catch {
    /* ignore */
  }
  return { theme: "light", language: detectLang(), notify: emptyNotify() };
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function loadGroupCache(code: string): Group | null {
  try {
    const raw = localStorage.getItem(groupKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Group;
    if (!parsed?.code) return null;
    return {
      ...parsed,
      dinners: parsed.dinners ?? [],
      wishlists: parsed.wishlists ?? [],
      sources: parsed.sources ?? [],
      events: parsed.events ?? [],
      items: parsed.items ?? [],
      members: parsed.members ?? [],
    };
  } catch {
    return null;
  }
}

export function saveGroupCache(group: Group): void {
  localStorage.setItem(groupKey(group.code), JSON.stringify(group));
}

export function clearGroupCache(code: string): void {
  localStorage.removeItem(groupKey(code));
}
