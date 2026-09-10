import type { Lang, Theme } from "./i18n";
import { detectLang } from "./i18n";
import { normalizeCode } from "./identity";
import type { Account, Group, Membership, Session } from "../types";

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

function asMembership(raw: Partial<Membership> & Partial<Session>): Membership | null {
  const groupCode = normalizeCode(String(raw.groupCode || ""));
  const profile = raw.profile;
  if (!groupCode || !profile?.id || !profile.name) return null;
  return {
    groupCode,
    groupName: raw.groupName ? String(raw.groupName) : undefined,
    profile: {
      id: String(profile.id),
      name: String(profile.name),
      color: String(profile.color || "#c45c26"),
    },
  };
}

export function loadAccount(): Account | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Account> & Partial<Session> & { memberships?: unknown };
    if (Array.isArray(parsed.memberships) && parsed.memberships.length) {
      const memberships = parsed.memberships
        .map((item) => asMembership(item as Membership))
        .filter((item): item is Membership => Boolean(item));
      if (!memberships.length) return null;
      const activeCode =
        normalizeCode(String(parsed.activeCode || "")) || memberships[0].groupCode;
      const active = memberships.find((item) => item.groupCode === activeCode) ?? memberships[0];
      return { activeCode: active.groupCode, memberships };
    }
    const legacy = asMembership(parsed);
    if (!legacy) return null;
    return { activeCode: legacy.groupCode, memberships: [legacy] };
  } catch {
    return null;
  }
}

export function saveAccount(account: Account): void {
  localStorage.setItem(KEY, JSON.stringify(account));
}

export function loadSession(): Session | null {
  const account = loadAccount();
  if (!account) return null;
  const active =
    account.memberships.find((item) => item.groupCode === account.activeCode) ?? account.memberships[0];
  return { profile: active.profile, groupCode: active.groupCode };
}

export function saveSession(session: Session): void {
  const current = loadAccount();
  const membership: Membership = { groupCode: session.groupCode, profile: session.profile };
  if (!current) {
    saveAccount({ activeCode: session.groupCode, memberships: [membership] });
    return;
  }
  const memberships = current.memberships.some((item) => item.groupCode === session.groupCode)
    ? current.memberships.map((item) => (item.groupCode === session.groupCode ? { ...item, ...membership } : item))
    : [...current.memberships, membership];
  saveAccount({ activeCode: session.groupCode, memberships });
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
      kickedIds: parsed.kickedIds ?? [],
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
