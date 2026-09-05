import { CalendarDays, Gift, Settings, ShoppingBasket, Soup, Users } from "lucide-react";
import { useApp } from "../state/AppState";
import { CalendarView } from "./CalendarView";
import { DinnerView } from "./DinnerView";
import { GroupView } from "./GroupView";
import { SettingsView } from "./SettingsView";
import { ShoppingView } from "./ShoppingView";
import { WishlistView } from "./WishlistView";

export function AppShell() {
  const { tab, setTab, t } = useApp();

  return (
    <div className="shell">
      <nav className="dock" aria-label={t("navMain")}>
        <button className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}>
          <CalendarDays size={18} />
          {t("tabCalendar")}
        </button>
        <button className={tab === "dinner" ? "active" : ""} onClick={() => setTab("dinner")}>
          <Soup size={18} />
          {t("tabDinner")}
        </button>
        <button className={tab === "shopping" ? "active" : ""} onClick={() => setTab("shopping")}>
          <ShoppingBasket size={18} />
          {t("tabShopping")}
        </button>
        <button className={tab === "wishlist" ? "active" : ""} onClick={() => setTab("wishlist")}>
          <Gift size={18} />
          {t("tabWishlist")}
        </button>
        <button className={tab === "group" ? "active" : ""} onClick={() => setTab("group")}>
          <Users size={18} />
          {t("tabGroup")}
        </button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
          <Settings size={18} />
          {t("tabSettings")}
        </button>
      </nav>
      {tab === "calendar" ? <CalendarView /> : null}
      {tab === "dinner" ? <DinnerView /> : null}
      {tab === "shopping" ? <ShoppingView /> : null}
      {tab === "wishlist" ? <WishlistView /> : null}
      {tab === "group" ? <GroupView /> : null}
      {tab === "settings" ? <SettingsView /> : null}
    </div>
  );
}
