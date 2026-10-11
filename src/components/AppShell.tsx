import { CalendarDays, ChevronDown, ChevronUp, Ellipsis, Gift, ListTodo, Settings, ShoppingBasket, Soup, Users, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useApp } from "../state/AppState";
import type { Tab } from "../types";
import { CalendarView } from "./CalendarView";
import { DinnerView } from "./DinnerView";
import { GroupView } from "./GroupView";
import { SettingsView } from "./SettingsView";
import { ShoppingView } from "./ShoppingView";
import { SpendingView } from "./SpendingView";
import { TodoView } from "./TodoView";
import { WishlistView } from "./WishlistView";

type NavLabel = "tabCalendar" | "tabDinner" | "tabShopping" | "tabTodos" | "tabSpendings" | "tabWishlist" | "tabGroup" | "tabSettings";

type NavItem = { id: Tab; icon: LucideIcon; label: NavLabel };

const NAV_ITEMS: NavItem[] = [
  { id: "calendar", icon: CalendarDays, label: "tabCalendar" },
  { id: "dinner", icon: Soup, label: "tabDinner" },
  { id: "shopping", icon: ShoppingBasket, label: "tabShopping" },
  { id: "todos", icon: ListTodo, label: "tabTodos" },
  { id: "spendings", icon: Wallet, label: "tabSpendings" },
  { id: "wishlist", icon: Gift, label: "tabWishlist" },
  { id: "group", icon: Users, label: "tabGroup" },
  { id: "settings", icon: Settings, label: "tabSettings" },
];

const PRIMARY_IDS: Tab[] = ["calendar", "shopping", "dinner"];
const LIST_IDS: Tab[] = ["todos", "spendings", "wishlist"];
const HOUSEHOLD_IDS: Tab[] = ["group", "settings"];
const MORE_IDS: Tab[] = [...LIST_IDS, ...HOUSEHOLD_IDS];
const DOCK_KEY = "famcal.dock-open";

type BarSlot = NavItem | "more";

function isOn(item: NavItem, menu: Record<Exclude<Tab, "settings">, boolean>) {
  return item.id === "settings" || item.id === "todos" || menu[item.id];
}

function pick(ids: Tab[], visible: NavItem[]) {
  const byId = new Map(visible.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is NavItem => Boolean(item));
}

function mobileSlots(visible: NavItem[]): { bar: BarSlot[]; sheet: NavItem[] } {
  const primary = pick(PRIMARY_IDS, visible);
  const rest = pick(
    MORE_IDS.filter((id) => id !== "todos"),
    visible,
  );
  const todos = NAV_ITEMS.find((item) => item.id === "todos");
  const sheet = todos ? [todos, ...rest] : rest;
  return { bar: [...primary, "more"], sheet };
}

function readDockOpen() {
  try {
    return localStorage.getItem(DOCK_KEY) !== "0";
  } catch {
    return true;
  }
}

export function AppShell() {
  const { tab, setTab, t, menu, group } = useApp();
  const visible = NAV_ITEMS.filter((item) => isOn(item, menu));
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  const [moreOpen, setMoreOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(readDockOpen);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const dockToggleReady = useRef(false);
  const wideRef = useRef(wide);
  wideRef.current = wide;

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => {
      setWide(mq.matches);
      if (mq.matches) setMoreOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const { bar, sheet } = wide ? { bar: visible as BarSlot[], sheet: [] } : mobileSlots(visible);
  const moreActive = sheet.some((item) => item.id === tab);
  const listItems = sheet.filter((item) => LIST_IDS.includes(item.id));
  const householdItems = sheet.filter((item) => HOUSEHOLD_IDS.includes(item.id));
  const dockCollapsed = !wide && !dockOpen;

  useEffect(() => {
    if (sheet.length === 0) setMoreOpen(false);
  }, [sheet.length]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  useEffect(() => {
    if (!dockToggleReady.current) {
      dockToggleReady.current = true;
      return;
    }
    if (wideRef.current) return;
    const target = dockOpen ? collapseRef.current : expandRef.current;
    target?.focus();
  }, [dockOpen]);

  const go = (id: Tab) => {
    setTab(id);
    setMoreOpen(false);
  };

  const toggleDock = () => {
    setDockOpen((current) => {
      const next = !current;
      try {
        localStorage.setItem(DOCK_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!next) setMoreOpen(false);
      return next;
    });
  };

  const renderTab = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => go(item.id)}>
        <Icon size={18} />
        <span>{t(item.label)}</span>
      </button>
    );
  };

  const renderMoreRow = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => go(item.id)}>
        <Icon size={18} />
        <span>{t(item.label)}</span>
      </button>
    );
  };

  return (
    <div className={`shell${dockCollapsed ? " dock-collapsed" : ""}`}>
      {moreOpen ? <button type="button" className="more-backdrop" aria-label={t("moreClose")} onClick={() => setMoreOpen(false)} /> : null}
      {dockCollapsed ? (
        <button ref={expandRef} type="button" className="dock-expand" aria-expanded={false} aria-controls="app-dock" onClick={toggleDock}>
          <ChevronUp size={18} />
          <span>{t("expandMenu")}</span>
        </button>
      ) : null}
      <nav
        id="app-dock"
        className={`dock${moreOpen ? " more-open" : ""}${dockCollapsed ? " collapsed" : ""}`}
        aria-label={t("navMain")}
        aria-hidden={dockCollapsed}
        inert={dockCollapsed}
        style={{ "--dock-cols": String(Math.max(1, bar.length)) } as CSSProperties}
      >
        {!wide ? (
          <button ref={collapseRef} type="button" className="dock-collapse" aria-expanded={true} aria-controls="app-dock" onClick={toggleDock}>
            <ChevronDown size={18} />
            <span>{t("collapseMenu")}</span>
          </button>
        ) : null}
        {moreOpen && sheet.length ? (
          <div className="more-sheet" id="more-sheet" role="dialog" aria-modal="true" aria-label={t("tabMore")}>
            {listItems.length ? (
              <div className="more-group">
                <p className="more-heading">{t("moreLists")}</p>
                {listItems.map(renderMoreRow)}
              </div>
            ) : null}
            {householdItems.length ? (
              <div className="more-group">
                <p className="more-heading">{t("moreHousehold")}</p>
                {householdItems.map(renderMoreRow)}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="dock-items">
          {bar.map((slot) => {
            if (slot !== "more") return renderTab(slot);
            return (
              <button
                key="more"
                type="button"
                className={moreActive || moreOpen ? "active" : ""}
                aria-expanded={moreOpen}
                aria-controls="more-sheet"
                aria-haspopup="dialog"
                onClick={() => setMoreOpen((current) => !current)}
              >
                <Ellipsis size={18} />
                <span>{t("tabMore")}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="workspace">
        {group?.name ? (
          <header className="group-banner">
            <h1 className="group-title">{group.name}</h1>
          </header>
        ) : null}
        {tab === "calendar" && menu.calendar ? <CalendarView /> : null}
        {tab === "dinner" && menu.dinner ? <DinnerView /> : null}
        {tab === "shopping" && menu.shopping ? <ShoppingView /> : null}
        {tab === "todos" ? <TodoView /> : null}
        {tab === "spendings" && menu.spendings ? <SpendingView /> : null}
        {tab === "wishlist" && menu.wishlist ? <WishlistView /> : null}
        {tab === "group" && menu.group ? <GroupView /> : null}
        {tab === "settings" ? <SettingsView /> : null}
      </div>
    </div>
  );
}
