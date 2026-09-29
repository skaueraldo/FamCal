import { CalendarDays, Ellipsis, Gift, ListTodo, Settings, ShoppingBasket, Soup, Users, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
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

type BarSlot = NavItem | "more";

function isOn(item: NavItem, menu: Record<Exclude<Tab, "settings">, boolean>) {
  return item.id === "settings" || menu[item.id];
}

function pick(ids: Tab[], visible: NavItem[]) {
  const byId = new Map(visible.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is NavItem => Boolean(item));
}

function mobileSlots(visible: NavItem[]): { bar: BarSlot[]; sheet: NavItem[] } {
  const primary = pick(PRIMARY_IDS, visible);
  const sheet = pick(MORE_IDS, visible);
  if (primary.length + sheet.length <= 4) return { bar: [...primary, ...sheet], sheet: [] };
  return { bar: [...primary, "more"], sheet };
}

export function AppShell() {
  const { tab, setTab, t, menu, group } = useApp();
  const visible = NAV_ITEMS.filter((item) => isOn(item, menu));
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const go = (id: Tab) => {
    setTab(id);
    setMoreOpen(false);
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
    <div className="shell">
      {moreOpen ? <button type="button" className="more-backdrop" aria-label={t("moreClose")} onClick={() => setMoreOpen(false)} /> : null}
      <nav className={`dock${moreOpen ? " more-open" : ""}`} aria-label={t("navMain")} style={{ "--dock-cols": String(Math.max(1, bar.length)) } as CSSProperties}>
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
        {tab === "todos" && menu.todos ? <TodoView /> : null}
        {tab === "spendings" && menu.spendings ? <SpendingView /> : null}
        {tab === "wishlist" && menu.wishlist ? <WishlistView /> : null}
        {tab === "group" && menu.group ? <GroupView /> : null}
        {tab === "settings" ? <SettingsView /> : null}
      </div>
    </div>
  );
}
