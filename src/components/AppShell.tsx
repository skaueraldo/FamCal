import { CalendarDays, Gift, ListTodo, Menu, Settings, ShoppingBasket, Soup, Users, Wallet, type LucideIcon } from "lucide-react";
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

const DAILY_IDS: Tab[] = ["calendar", "shopping", "dinner"];
const LIST_IDS: Tab[] = ["todos", "spendings", "wishlist"];
const HOUSEHOLD_IDS: Tab[] = ["group", "settings"];

function isOn(item: NavItem, menu: Record<Exclude<Tab, "settings">, boolean>) {
  return item.id === "settings" || item.id === "todos" || menu[item.id];
}

function pick(ids: Tab[], visible: NavItem[]) {
  const byId = new Map(visible.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is NavItem => Boolean(item));
}

export function AppShell() {
  const { tab, setTab, t, menu, group } = useApp();
  const visible = NAV_ITEMS.filter((item) => isOn(item, menu));
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => {
      setWide(mq.matches);
      if (mq.matches) setMenuOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const dailyItems = pick(DAILY_IDS, visible);
  const listItems = pick(LIST_IDS, visible);
  const householdItems = pick(HOUSEHOLD_IDS, visible);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || wide) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = drawerRef.current?.querySelector<HTMLButtonElement>("button");
    first?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen, wide]);

  const closeMenu = () => {
    setMenuOpen(false);
    menuBtnRef.current?.focus();
  };

  const go = (id: Tab) => {
    setTab(id);
    setMenuOpen(false);
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

  const renderGroup = (label: string, items: NavItem[]) => {
    if (!items.length) return null;
    return (
      <div className="more-group">
        <p className="more-heading">{label}</p>
        {items.map(renderItem)}
      </div>
    );
  };

  return (
    <div className="shell">
      {wide ? (
        <nav className="dock" aria-label={t("navMain")}>
          <div className="dock-items">{visible.map(renderItem)}</div>
        </nav>
      ) : (
        <>
          {menuOpen ? <button type="button" className="menu-backdrop" aria-label={t("moreClose")} onClick={closeMenu} /> : null}
          <nav
            ref={drawerRef}
            id="app-drawer"
            className={`drawer${menuOpen ? " open" : ""}`}
            aria-label={t("navMain")}
            aria-hidden={!menuOpen}
            inert={!menuOpen}
          >
            {renderGroup(t("moreDaily"), dailyItems)}
            {renderGroup(t("moreLists"), listItems)}
            {renderGroup(t("moreHousehold"), householdItems)}
          </nav>
        </>
      )}
      <div className="workspace">
        {group?.name || !wide ? (
          <header className="group-banner">
            {group?.name ? <h1 className="group-title">{group.name}</h1> : <span />}
            {!wide ? (
              <button
                ref={menuBtnRef}
                type="button"
                className="menu-btn"
                aria-label={t("tabMore")}
                aria-expanded={menuOpen}
                aria-controls="app-drawer"
                onClick={() => setMenuOpen((current) => !current)}
              >
                <Menu size={24} strokeWidth={2.25} />
              </button>
            ) : null}
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
