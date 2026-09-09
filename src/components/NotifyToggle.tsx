import { Bell } from "lucide-react";
import { useState } from "react";
import { notificationsSupported, requestNotificationPermission } from "../lib/notifications";
import type { NotifyChannel } from "../lib/storage";
import { useApp } from "../state/AppState";

const labels: Record<NotifyChannel, "notifyCalendar" | "notifyDinner" | "notifyShopping" | "notifyWishlist"> = {
  calendar: "notifyCalendar",
  dinner: "notifyDinner",
  shopping: "notifyShopping",
  wishlist: "notifyWishlist",
};

export function NotifyToggle({ channel }: { channel: NotifyChannel }) {
  const { notify, setNotify, t } = useApp();
  const [hint, setHint] = useState<string | null>(null);
  const on = notify[channel];

  const toggle = async () => {
    if (on) {
      setNotify(channel, false);
      setHint(null);
      return;
    }
    if (!notificationsSupported()) {
      setHint(t("notificationsUnsupported"));
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      setNotify(channel, false);
      setHint(t("notificationsDenied"));
      return;
    }
    setNotify(channel, true);
    setHint(null);
  };

  return (
    <label className={`notify-toggle${on ? " on" : ""}`} title={hint ?? t(labels[channel])}>
      <input type="checkbox" checked={on} onChange={() => void toggle()} aria-label={t(labels[channel])} />
      <Bell size={16} strokeWidth={2.2} aria-hidden="true" />
      <span>{t("notifyToggle")}</span>
    </label>
  );
}
