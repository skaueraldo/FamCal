import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { colorFor, uid } from "../lib/id";
import { parseIcs, sourceNameFromIcs } from "../lib/ics";
import { mapKnownError, t as translate, type Lang, type MessageKey, type Theme } from "../lib/i18n";
import { clearGroupCache, clearSession, emptyNotify, loadGroupCache, loadPrefs, loadSession, saveGroupCache, savePrefs, saveSession, type NotifyChannel, type NotifyPrefs } from "../lib/storage";
import { SyncClient, createGroup, fetchGroup, fetchIcsUrl, importSpondAccount, refreshSpondAccount, restoreGroup } from "../lib/sync";
import type { CalEvent, Dinner, Group, Profile, Session, ShopItem, Source, Tab, Wishlist } from "../types";

interface AppContextValue {
  tab: Tab;
  setTab: (tab: Tab) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Lang;
  setLanguage: (language: Lang) => void;
  notify: NotifyPrefs;
  setNotify: (channel: NotifyChannel, on: boolean) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  localizeError: (message: string) => string;
  session: Session | null;
  group: Group | null;
  status: "connecting" | "live" | "offline";
  error: string | null;
  startGroup: (name: string, groupName: string) => Promise<void>;
  joinGroup: (name: string, code: string) => Promise<void>;
  leaveGroup: () => void;
  kickMember: (id: string) => void;
  makeAdmin: (id: string) => void;
  renameGroup: (name: string) => void;
  upsertEvent: (event: CalEvent) => void;
  deleteEvent: (id: string) => void;
  upsertItem: (item: ShopItem) => void;
  deleteItem: (id: string) => void;
  upsertDinner: (dinner: Dinner) => void;
  deleteDinner: (id: string) => void;
  upsertWishlist: (list: Wishlist) => void;
  deleteWishlist: (id: string) => void;
  importIcsText: (raw: string, fileName: string) => number;
  importIcsUrl: (url: string, label?: string) => Promise<number>;
  importSpond: (email: string, password: string) => Promise<number>;
  deleteSource: (id: string) => void;
  refreshSource: (source: Source) => Promise<number>;
}

const AppContext = createContext<AppContextValue | null>(null);

const emptyGroup = (code: string, name: string, profile: Profile): Group => ({
  code,
  name,
  members: [{ ...profile, admin: true }],
  kickedIds: [],
  events: [],
  items: [],
  dinners: [],
  wishlists: [],
  sources: [],
  updatedAt: Date.now(),
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>("calendar");
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const theme = prefs.theme;
  const language = prefs.language;
  const notify = prefs.notify;
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(language, key, vars);
  const localizeError = (message: string) => mapKnownError(language, message);
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [group, setGroup] = useState<Group | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("offline");
  const [error, setError] = useState<string | null>(null);
  const sync = useRef(new SyncClient());

  const applyGroup = useCallback((next: Group) => {
    const members = (next.members ?? []).map((member) => ({ ...member, admin: Boolean(member.admin) }));
    if (members.length && !members.some((member) => member.admin)) members[0].admin = true;
    setGroup({
      ...next,
      members,
      kickedIds: next.kickedIds ?? [],
      dinners: next.dinners ?? [],
      wishlists: next.wishlists ?? [],
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language === "no" ? "nb" : "en";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#161310" : "#f3eee4");
  }, [theme, language]);

  const setTheme = (next: Theme) => {
    setPrefs((current) => {
      const prefsNext = { ...current, theme: next };
      savePrefs(prefsNext);
      return prefsNext;
    });
  };

  const setLanguage = (next: Lang) => {
    setPrefs((current) => {
      const prefsNext = { ...current, language: next };
      savePrefs(prefsNext);
      return prefsNext;
    });
  };

  const setNotify = (channel: NotifyChannel, on: boolean) => {
    setPrefs((current) => {
      const prefsNext = { ...current, notify: { ...emptyNotify(), ...current.notify, [channel]: on } };
      savePrefs(prefsNext);
      return prefsNext;
    });
  };

  useEffect(() => {
    const client = sync.current;
    const offState = client.subscribe(applyGroup);
    const offStatus = client.onStatus(setStatus);
    const offKicked = client.onKicked(() => {
      const code = loadSession()?.groupCode;
      client.disconnect();
      clearSession();
      if (code) clearGroupCache(code);
      setSession(null);
      setGroup(null);
      setTab("calendar");
      setError("You were removed from this group.");
    });
    return () => {
      offState();
      offStatus();
      offKicked();
      client.disconnect();
    };
  }, [applyGroup]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setError(null);
    const cached = loadGroupCache(session.groupCode);
    if (cached) {
      applyGroup(cached);
    }

    const hydrate = async () => {
      try {
        const remote = await fetchGroup(session.groupCode);
        if (cancelled) return;
        if (cached && cached.updatedAt > (remote.updatedAt || 0)) {
          const restored = await restoreGroup(cached);
          if (cancelled) return;
          applyGroup(restored);
        } else {
          applyGroup(remote);
        }
        sync.current.connect(session.groupCode, session.profile);
      } catch (err: unknown) {
        if (cancelled) return;
        if (cached) {
          try {
            const restored = await restoreGroup(cached);
            if (cancelled) return;
            applyGroup(restored);
            sync.current.connect(session.groupCode, session.profile);
            return;
          } catch {
            applyGroup(cached);
            sync.current.connect(session.groupCode, session.profile);
            return;
          }
        }
        setError(err instanceof Error ? err.message : "That group code was not found");
        setGroup(emptyGroup(session.groupCode, "Family", session.profile));
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
      sync.current.disconnect();
    };
  }, [session, applyGroup]);

  useEffect(() => {
    if (!session || !group) return;
    if (group.kickedIds?.includes(session.profile.id)) {
      sync.current.disconnect();
      clearSession();
      clearGroupCache(session.groupCode);
      setSession(null);
      setGroup(null);
      setTab("calendar");
      setError("You were removed from this group.");
    }
  }, [group, session]);

  useEffect(() => {
    if (!group) return;
    if (session && group.kickedIds?.includes(session.profile.id)) return;
    saveGroupCache(group);
  }, [group, session]);

  const persistSession = (next: Session) => {
    setSession(next);
    saveSession(next);
  };

  const startGroup = async (name: string, groupName: string) => {
    const profile: Profile = { id: uid("mem"), name: name.trim(), color: colorFor(0) };
    const created = await createGroup(groupName.trim() || "Family", profile);
    setError(null);
    applyGroup(created);
    saveGroupCache(created);
    persistSession({ profile, groupCode: created.code });
  };

  const joinGroup = async (name: string, code: string) => {
    const remote = await fetchGroup(code);
    const profile: Profile = {
      id: uid("mem"),
      name: name.trim(),
      color: colorFor(remote.members.length),
    };
    const next = {
      ...remote,
      members: [...remote.members, { ...profile, admin: false }],
      dinners: remote.dinners ?? [],
      wishlists: remote.wishlists ?? [],
      kickedIds: remote.kickedIds ?? [],
      updatedAt: Date.now(),
    };
    setError(null);
    applyGroup(next);
    saveGroupCache(next);
    persistSession({ profile, groupCode: remote.code });
  };

  const leaveGroup = () => {
    const code = session?.groupCode;
    sync.current.disconnect();
    clearSession();
    if (code) clearGroupCache(code);
    setSession(null);
    setGroup(null);
    setTab("calendar");
  };

  const patch = (updater: (current: Group) => Group, message?: Record<string, unknown>) => {
    setGroup((current) => {
      if (!current) return current;
      const next = { ...updater(current), updatedAt: Date.now() };
      if (message) sync.current.send(message);
      saveGroupCache(next);
      return next;
    });
  };

  const renameGroup = (name: string) => {
    patch((g) => ({ ...g, name }), { type: "group:rename", name });
  };

  const kickMember = (id: string) => {
    patch(
      (g) => ({
        ...g,
        members: g.members.filter((member) => member.id !== id),
        kickedIds: [...new Set([...(g.kickedIds ?? []), id])],
      }),
      { type: "member:kick", id },
    );
  };

  const makeAdmin = (id: string) => {
    patch(
      (g) => ({
        ...g,
        members: g.members.map((member) => (member.id === id ? { ...member, admin: true } : member)),
      }),
      { type: "member:admin", id },
    );
  };

  const upsertEvent = (event: CalEvent) => {
    patch(
      (g) => ({
        ...g,
        events: g.events.some((e) => e.id === event.id)
          ? g.events.map((e) => (e.id === event.id ? event : e))
          : [...g.events, event],
      }),
      { type: "event:upsert", event },
    );
  };

  const deleteEvent = (id: string) => {
    patch((g) => ({ ...g, events: g.events.filter((e) => e.id !== id) }), { type: "event:delete", id });
  };

  const upsertItem = (item: ShopItem) => {
    patch(
      (g) => ({
        ...g,
        items: g.items.some((i) => i.id === item.id)
          ? g.items.map((i) => (i.id === item.id ? item : i))
          : [...g.items, item],
      }),
      { type: "item:upsert", item },
    );
  };

  const deleteItem = (id: string) => {
    patch((g) => ({ ...g, items: g.items.filter((i) => i.id !== id) }), { type: "item:delete", id });
  };

  const upsertDinner = (dinner: Dinner) => {
    patch(
      (g) => ({
        ...g,
        dinners: (g.dinners ?? []).some((d) => d.id === dinner.id)
          ? (g.dinners ?? []).map((d) => (d.id === dinner.id ? dinner : d))
          : [...(g.dinners ?? []), dinner],
      }),
      { type: "dinner:upsert", dinner },
    );
  };

  const deleteDinner = (id: string) => {
    patch((g) => ({ ...g, dinners: (g.dinners ?? []).filter((d) => d.id !== id) }), { type: "dinner:delete", id });
  };

  const upsertWishlist = (list: Wishlist) => {
    patch(
      (g) => ({
        ...g,
        wishlists: (g.wishlists ?? []).some((w) => w.id === list.id)
          ? (g.wishlists ?? []).map((w) => (w.id === list.id ? list : w))
          : [...(g.wishlists ?? []), list],
      }),
      { type: "wishlist:upsert", wishlist: list },
    );
  };

  const deleteWishlist = (id: string) => {
    patch((g) => ({ ...g, wishlists: (g.wishlists ?? []).filter((w) => w.id !== id) }), { type: "wishlist:delete", id });
  };

  const mergeImported = (source: Source, events: CalEvent[]) => {
    patch(
      (g) => {
        const kept = g.events.filter((e) => e.sourceId !== source.id);
        const existingUids = new Set(kept.map((e) => e.uid).filter(Boolean));
        const incoming = events.filter((e) => !e.uid || !existingUids.has(e.uid));
        const sources = g.sources.some((s) => s.id === source.id)
          ? g.sources.map((s) => (s.id === source.id ? source : s))
          : [...g.sources, source];
        return { ...g, sources, events: [...kept, ...incoming] };
      },
      { type: "source:replace", source, events },
    );
  };

  const importIcsText = (raw: string, fileName: string) => {
    if (!session) return 0;
    const source: Source = {
      id: uid("src"),
      name: sourceNameFromIcs(raw, fileName.replace(/\.ics$/i, "") || "Imported calendar"),
      kind: "ics-file",
      lastImported: Date.now(),
    };
    const events = parseIcs(raw, session.profile.id, source.id);
    mergeImported(source, events);
    return events.length;
  };

  const importIcsUrl = async (url: string, label?: string) => {
    if (!session) return 0;
    const { text, resolvedUrl } = await fetchIcsUrl(url);
    const source: Source = {
      id: uid("src"),
      name: label || sourceNameFromIcs(text, "Shared calendar"),
      kind: "ics-url",
      url: resolvedUrl,
      lastImported: Date.now(),
    };
    const events = parseIcs(text, session.profile.id, source.id);
    mergeImported(source, events);
    return events.length;
  };

  const importSpond = async (email: string, password: string) => {
    if (!session) return 0;
    const existing = group?.sources.find((s) => s.kind === "spond" && s.email === email);
    const { source, events } = await importSpondAccount({
      groupCode: session.groupCode,
      memberId: session.profile.id,
      email,
      password,
      sourceId: existing?.id,
    });
    mergeImported(source, events);
    return events.length;
  };

  const deleteSource = (id: string) => {
    patch(
      (g) => ({
        ...g,
        sources: g.sources.filter((s) => s.id !== id),
        events: g.events.filter((e) => e.sourceId !== id),
      }),
      { type: "source:delete", id },
    );
  };

  const refreshSource = async (source: Source) => {
    if (!session) return 0;
    if (source.kind === "spond") {
      const { source: next, events } = await refreshSpondAccount({
        groupCode: session.groupCode,
        memberId: session.profile.id,
        sourceId: source.id,
      });
      mergeImported(next, events);
      return events.length;
    }
    if (!source.url) return 0;
    const { text, resolvedUrl } = await fetchIcsUrl(source.url);
    const events = parseIcs(text, session.profile.id, source.id);
    const next = {
      ...source,
      url: resolvedUrl,
      lastImported: Date.now(),
      name: sourceNameFromIcs(text, source.name),
    };
    mergeImported(next, events);
    return events.length;
  };

  return (
    <AppContext.Provider
      value={{
        tab,
        setTab,
        theme,
        setTheme,
        language,
        setLanguage,
        notify,
        setNotify,
        t,
        localizeError,
        session,
        group,
        status,
        error,
        startGroup,
        joinGroup,
        leaveGroup,
        kickMember,
        makeAdmin,
        renameGroup,
        upsertEvent,
        deleteEvent,
        upsertItem,
        deleteItem,
        upsertDinner,
        deleteDinner,
        upsertWishlist,
        deleteWishlist,
        importIcsText,
        importIcsUrl,
        importSpond,
        deleteSource,
        refreshSource,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
