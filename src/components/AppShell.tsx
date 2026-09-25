import { CalendarDays, ChevronDown, Gift, ListTodo, Settings, ShoppingBasket, Soup, Users, Wallet, type LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
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

const items: { id: Tab; icon: LucideIcon; label: "tabCalendar" | "tabDinner" | "tabShopping" | "tabTodos" | "tabSpendings" | "tabWishlist" | "tabGroup" | "tabSettings" }[] = [
  { id: "calendar", icon: CalendarDays, label: "tabCalendar" },
  { id: "dinner", icon: Soup, label: "tabDinner" },
  { id: "shopping", icon: ShoppingBasket, label: "tabShopping" },
  { id: "todos", icon: ListTodo, label: "tabTodos" },
  { id: "spendings", icon: Wallet, label: "tabSpendings" },
  { id: "wishlist", icon: Gift, label: "tabWishlist" },
  { id: "group", icon: Users, label: "tabGroup" },
  { id: "settings", icon: Settings, label: "tabSettings" },
];

const DOCK_COL_MIN = 72;

export function AppShell() {
  const { tab, setTab, t, menu, group } = useApp();
  const visible = items.filter((item) => item.id === "settings" || menu[item.id]);
  const dockRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  const [cols, setCols] = useState(visible.length);

  useLayoutEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const measure = () => {
      const wideNow = window.matchMedia("(min-width: 900px)").matches;
      setWide(wideNow);
      if (wideNow) {
        setOpen(false);
        return;
      }
      const styles = getComputedStyle(el);
      const pad = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const gap = parseFloat(styles.columnGap || styles.gap) || 4;
      const inner = el.clientWidth - pad;
      setCols(Math.max(1, Math.floor((inner + gap) / (DOCK_COL_MIN + gap))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const overflow = !wide && visible.length > cols;
  const shown =
    overflow && !open && !visible.slice(0, cols).some((item) => item.id === tab)
      ? [visible.find((item) => item.id === tab) ?? visible[0], ...visible.filter((item) => item.id !== tab)]
      : visible;

  return (
    <div className={`shell${open && overflow ? " dock-open" : ""}`}>
      <nav ref={dockRef} className={`dock${open ? " open" : ""}${overflow ? " has-more" : ""}`} aria-label={t("navMain")}>
        <div className="dock-items">
          {shown.map((item, index) => {
            const Icon = item.icon;
            const hidden = overflow && !open && index >= cols;
            return (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "active" : ""}
                tabIndex={hidden ? -1 : undefined}
                aria-hidden={hidden || undefined}
                onClick={() => {
                  setTab(item.id);
                  setOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{t(item.label)}</span>
              </button>
            );
          })}
        </div>
        {overflow ? (
          <button
            type="button"
            className="dock-toggle"
            aria-expanded={open}
            aria-label={open ? t("menuCollapse") : t("menuExpand")}
            onClick={() => setOpen((current) => !current)}
          >
            <ChevronDown size={16} />
          </button>
        ) : null}
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
