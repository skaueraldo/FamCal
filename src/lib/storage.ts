import type { Lang, Theme } from "./i18n";
import { detectLang } from "./i18n";
import type { Session } from "../types";

const KEY = "famcal.session";
const PREFS_KEY = "famcal.prefs";

export interface Prefs {
  theme: Theme;
  language: Lang;
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Prefs>;
      return {
        theme: parsed.theme === "dark" ? "dark" : "light",
        language: parsed.language === "no" ? "no" : parsed.language === "en" ? "en" : detectLang(),
      };
    }
  } catch {
    /* ignore */
  }
  return { theme: "light", language: detectLang() };
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
