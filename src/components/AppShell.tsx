import { CalendarDays, ChevronDown, ChevronUp, Gift, ListTodo, Settings, ShoppingBasket, Soup, Users, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const DAILY_IDS: Tab[] = ["calendar", "dinner", "shopping"];
const LIST_IDS: Tab[] = ["todos", "spendings", "wishlist"];
const HOUSEHOLD_IDS: Tab[] = ["group", "settings"];
const DOCK_KEY = "famcal.dock-open";

function isOn(item: NavItem, menu: Record<Exclude<Tab, "settings">, boolean>) {
  return item.id === "settings" || item.id === "todos" || menu[item.id];
}

function pick(ids: Tab[], visible: NavItem[]) {
  const byId = new Map(visible.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is NavItem => Boolean(item));
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
  const [dockOpen, setDockOpen] = useState(readDockOpen);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const dockToggleReady = useRef(false);
  const wideRef = useRef(wide);
  wideRef.current = wide;

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const dailyItems = pick(DAILY_IDS, visible);
  const listItems = pick(LIST_IDS, visible);
  const householdItems = pick(HOUSEHOLD_IDS, visible);
  const groups = [
    { label: "moreDaily" as const, items: dailyItems },
    { label: "moreLists" as const, items: listItems },
    { label: "moreHousehold" as const, items: householdItems },
  ];
  const dockCollapsed = !wide && !dockOpen;
  const visibleKey = visible.map((item) => item.id).join();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const dock = dockRef.current;
    if (!dock || wide || !dockOpen) {
      root.style.removeProperty("--dock-offset");
      return;
    }
    const apply = () => {
      root.style.setProperty("--dock-offset", `${Math.ceil(dock.getBoundingClientRect().height)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(dock);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--dock-offset");
    };
  }, [wide, dockOpen, visibleKey]);

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
  };

  const toggleDock = () => {
    setDockOpen((current) => {
      const next = !current;
      try {
        localStorage.setItem(DOCK_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const renderItem = (item: NavItem) => {
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
      {dockCollapsed ? (
        <button ref={expandRef} type="button" className="dock-expand" aria-expanded={false} aria-controls="app-dock" onClick={toggleDock}>
          <ChevronUp size={18} />
          <span>{t("expandMenu")}</span>
        </button>
      ) : null}
      <nav
        ref={dockRef}
        id="app-dock"
        className={`dock${dockCollapsed ? " collapsed" : ""}`}
        aria-label={t("navMain")}
        aria-hidden={dockCollapsed}
        inert={dockCollapsed}
      >
        {!wide ? (
          <button ref={collapseRef} type="button" className="dock-collapse" aria-expanded={true} aria-controls="app-dock" onClick={toggleDock}>
            <ChevronDown size={18} />
            <span>{t("collapseMenu")}</span>
          </button>
        ) : null}
        {!wide ? (
          <div className="more-sheet">
            {groups.map((section) =>
              section.items.length ? (
                <div key={section.label} className="more-group">
                  <p className="more-heading">{t(section.label)}</p>
                  {section.items.map(renderItem)}
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <div className="dock-items">{visible.map(renderItem)}</div>
        )}
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
