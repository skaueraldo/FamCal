import { CalendarDays, Gift, ListTodo, Settings, ShoppingBasket, Soup, Users, Wallet, type LucideIcon } from "lucide-react";
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

export function AppShell() {
  const { tab, setTab, t, menu, group } = useApp();
  const visible = items.filter((item) => item.id === "settings" || menu[item.id]);

  return (
    <div className="shell">
      <nav className="dock" aria-label={t("navMain")}>
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
              <Icon size={18} />
              {t(item.label)}
            </button>
          );
        })}
      </nav>
      <div className="workspace">
        {group?.name ? (
          <header className="group-banner">
            <h1 className="group-title">{group.name}</h1>
          </header>
        ) : null}
        {tab === "calendar" ? <CalendarView /> : null}
        {tab === "dinner" ? <DinnerView /> : null}
        {tab === "shopping" ? <ShoppingView /> : null}
        {tab === "todos" ? <TodoView /> : null}
        {tab === "spendings" ? <SpendingView /> : null}
        {tab === "wishlist" ? <WishlistView /> : null}
        {tab === "group" ? <GroupView /> : null}
        {tab === "settings" ? <SettingsView /> : null}
      </div>
    </div>
  );
}
